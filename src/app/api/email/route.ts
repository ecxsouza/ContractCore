export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, isEmailConfigured } from '@/lib/email';
import {
  emailContratoEnviado,
  emailAssinaturaRegistrada,
  emailContratoRenovado,
} from '@/lib/email/templates';

// ================================================================
// POST /api/email
// Envia e-mails relacionados a contratos
// Body: { tipo, contractId, destinatario?, instrucoes? }
// ================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar se Resend está configurado
    if (!isEmailConfigured()) {
      return NextResponse.json({
        error: 'E-mail não configurado. Adicione RESEND_API_KEY nas variáveis de ambiente.',
        configured: false,
      }, { status: 503 });
    }

    // 2. Autenticação
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data: company } = await supabase
      .from('companies').select('*').eq('user_id', user.id).single();
    if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

    const body = await request.json();
    const { tipo, contractId, destinatario, instrucoes } = body as {
      tipo:          'contrato' | 'assinatura' | 'renovacao';
      contractId:    string;
      destinatario?: string;  // e-mail extra além do prestador
      instrucoes?:   string;
    };

    if (!contractId) {
      return NextResponse.json({ error: 'contractId obrigatório' }, { status: 400 });
    }

    // 3. Buscar contrato e prestador
    const { data: contract } = await supabase
      .from('contracts')
      .select(`*, service_providers (*)`)
      .eq('id', contractId)
      .eq('company_id', company.id)
      .single();

    if (!contract) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    const provider: any = contract.service_providers;
    const emailPrestador  = provider?.email || destinatario;
    const nomePrestador   = provider?.nome_razao_social || 'Prestador';

    if (!emailPrestador) {
      return NextResponse.json({
        error: 'Prestador sem e-mail cadastrado. Adicione o e-mail no cadastro do prestador.'
      }, { status: 400 });
    }

    // Montar vigência
    const vigencia = contract.vigencia_indeterminada
      ? 'Prazo indeterminado'
      : `${contract.data_vigencia_inicio || '—'} até ${contract.data_vigencia_fim || '—'}`;

    const profissaoLabel: Record<string, string> = {
      psicologo: 'Psicólogo(a)', neuropsicologo: 'Neuropsicólogo(a)',
      fonoaudiologo: 'Fonoaudiólogo(a)', psicopedagogo: 'Psicopedagogo(a)',
      secretaria: 'Secretária', outro: 'Profissional Autônomo',
    };

    let emailParams: { subject: string; html: string };
    let destinatarios: string[] = [emailPrestador];
    if (destinatario && destinatario !== emailPrestador) destinatarios.push(destinatario);

    // 4. Montar e-mail conforme tipo
    if (tipo === 'contrato') {
      emailParams = emailContratoEnviado({
        companyName:    company.nome_fantasia || company.razao_social,
        companyLogo:    company.logo_url,
        recipientName:  nomePrestador,
        numeroContrato: contract.numero_contrato,
        profissao:      profissaoLabel[provider?.profissao] || provider?.profissao || '—',
        vigencia,
        instrucoes,
      });

    } else if (tipo === 'assinatura') {
      const ambos = contract.assinado_contratante && contract.assinado_prestador;
      const quemAssinou = contract.assinado_contratante && !contract.assinado_prestador
        ? company.nome_fantasia
        : nomePrestador;

      emailParams = emailAssinaturaRegistrada({
        companyName:    company.nome_fantasia || company.razao_social,
        companyLogo:    company.logo_url,
        recipientName:  nomePrestador,
        numeroContrato: contract.numero_contrato,
        quemAssinou,
        ambosAssinaram: ambos,
        dataAssinatura: new Date().toLocaleDateString('pt-BR'),
      });

    } else {
      return NextResponse.json({ error: 'Tipo de e-mail inválido' }, { status: 400 });
    }

    // 5. Enviar
    // Remetente: Nome Fantasia <email@empresa.com>
    // Em produção, o domínio deve estar verificado no Resend
    const fromEmail = company.email && company.nome_fantasia
      ? `${company.nome_fantasia} <${company.email}>`
      : process.env.RESEND_FROM_EMAIL || 'ContractCore <onboarding@resend.dev>';

    const resultado = await sendEmail({
      to:       destinatarios,
      subject:  emailParams.subject,
      html:     emailParams.html,
      from:     fromEmail,
      replyTo:  company.email,
    });

    if (!resultado.success) {
      return NextResponse.json({ error: resultado.error }, { status: 500 });
    }

    // 6. Log de auditoria
    try {
      await supabase.from('audit_logs').insert({
        company_id:  company.id,
        user_id:     user.id,
        acao:        `email.${tipo}_enviado`,
        tabela:      'contracts',
        registro_id: contractId,
      });
    } catch (_) {}

    return NextResponse.json({
      success:  true,
      email_id: resultado.id,
      enviado_para: destinatarios,
    });

  } catch (err: any) {
    console.error('[/api/email]', err);
    return NextResponse.json({ error: 'Erro interno ao enviar e-mail.' }, { status: 500 });
  }
}
