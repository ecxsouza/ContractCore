import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail, isEmailConfigured } from '@/lib/email';
import { emailContratoVencendo } from '@/lib/email/templates';

// ================================================================
// GET /api/cron/notifications
// Executado automaticamente pelo Vercel Cron Jobs
// Configurado em vercel.json — roda todo dia às 08h (horário de Brasília)
//
// SEGURANÇA: Vercel envia header CRON_SECRET para autenticar
// ================================================================

export async function GET(request: NextRequest) {
  // Verificar token de autenticação do cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase    = createServiceClient();
  const emailAtivo  = isEmailConfigured();

  const resultados: {
    empresa:    string;
    alertas:    number;
    emails:     number;
    erros:      string[];
  }[] = [];

  try {
    // Buscar todas as empresas ativas
    const { data: companies } = await supabase
      .from('companies')
      .select('id, razao_social, nome_fantasia, email, logo_url');

    if (!companies?.length) {
      return NextResponse.json({ message: 'Nenhuma empresa encontrada', resultados });
    }

    for (const company of companies) {
      const erros: string[] = [];
      let emailsEnviados = 0;

      // 1. Gerar/atualizar alertas de compliance
      const { data: alertCount } = await supabase
        .rpc('generate_compliance_alerts', { p_company_id: company.id });

      // 2. Buscar contratos vencendo nos próximos 30 dias (se e-mail ativo)
      if (emailAtivo) {
        const { data: vencendo } = await supabase
          .from('contracts')
          .select(`
            id, numero_contrato, data_vigencia_fim,
            service_providers (nome_razao_social, email)
          `)
          .eq('company_id', company.id)
          .eq('vigencia_indeterminada', false)
          .not('status', 'in', '("cancelado","encerrado")')
          .gte('data_vigencia_fim', new Date().toISOString().split('T')[0])
          .lte('data_vigencia_fim', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);

        // Enviar alerta para cada contrato vencendo
        for (const contract of (vencendo || [])) {
          const provider: any = contract.service_providers;
          const vencimento    = new Date(contract.data_vigencia_fim + 'T12:00:00');
          const hoje          = new Date();
          const diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / 86400000);

          // Enviar apenas em marcos específicos: 30, 15, 7, 3, 1 dia(s)
          const marcos = [30, 15, 7, 3, 1];
          if (!marcos.includes(diasRestantes)) continue;

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contractcore.vercel.app';

          const { subject, html } = emailContratoVencendo({
            companyName:     company.nome_fantasia || company.razao_social,
            companyLogo:     company.logo_url,
            recipientName:   company.nome_fantasia || company.razao_social,
            numeroContrato:  contract.numero_contrato,
            prestadorNome:   provider?.nome_razao_social || 'Prestador',
            dataVencimento:  vencimento.toLocaleDateString('pt-BR'),
            diasRestantes,
            linkContrato:    `${appUrl}/contracts/${contract.id}`,
          });

          const resultado = await sendEmail({
            to:       company.email,
            subject,
            html,
          });

          if (resultado.success) {
            emailsEnviados++;
          } else {
            erros.push(`Erro ao enviar para ${company.email}: ${resultado.error}`);
          }
        }

        // 3. Alertas de assinatura pendente há 7+ dias
        const { data: pendentes } = await supabase
          .from('contracts')
          .select('id, numero_contrato, created_at, service_providers (nome_razao_social)')
          .eq('company_id', company.id)
          .eq('status', 'aguardando_assinatura')
          .lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

        for (const contract of (pendentes || [])) {
          const diasPendente = Math.floor(
            (Date.now() - new Date(contract.created_at).getTime()) / 86400000
          );

          // Notificar apenas nos dias 7, 14, 21
          if (![7, 14, 21].includes(diasPendente)) continue;

          const provider: any = contract.service_providers;
          const resultado = await sendEmail({
            to:      company.email,
            subject: `[ContractCore] ⏳ Assinatura pendente há ${diasPendente} dias — ${contract.numero_contrato}`,
            html:    `
              <p>O contrato <strong>${contract.numero_contrato}</strong> com <strong>${provider?.nome_razao_social || 'Prestador'}</strong> aguarda assinatura há <strong>${diasPendente} dias</strong>.</p>
              <p>Acesse o ContractCore para verificar o status e tomar as medidas necessárias.</p>
            `,
          });

          if (resultado.success) emailsEnviados++;
        }
      }

      resultados.push({
        empresa:  company.nome_fantasia || company.razao_social,
        alertas:  alertCount || 0,
        emails:   emailsEnviados,
        erros,
      });
    }

    // Log no Supabase — silencioso se falhar
    try {
      await supabase.from('audit_logs').insert({
        acao: 'cron.notifications_executed',
        dados_depois: { resultados, emailAtivo, timestamp: new Date().toISOString() },
      });
    } catch (_) { /* silencioso */ }

    return NextResponse.json({
      success:   true,
      empresas:  resultados.length,
      emailAtivo,
      resultados,
      executado: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error('[cron/notifications]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
