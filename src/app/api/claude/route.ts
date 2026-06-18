export const dynamic     = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse }    from 'next/server';
import { createClient }                  from '@/lib/supabase/server';
import { enrichContractWithAI, suggestContractObject } from '@/lib/claude';
import { generateContractHTML }          from '@/lib/pdf/generator';
import type { ContractFormData, Company } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json() as {
      tipo?:          string;
      contract_id?:   string;
      formData:       ContractFormData;
      company:        Company;
      profissao?:     string;
      especialidade?: string;
    };

    const { tipo, formData, company, profissao, especialidade, contract_id } = body;

    // ── Sugestão de objeto ────────────────────────────────────────
    if (tipo === 'sugestao_objeto') {
      if (!profissao) {
        return NextResponse.json({ error: 'Profissão obrigatória' }, { status: 400 });
      }
      const objeto = await suggestContractObject(profissao, especialidade);
      return NextResponse.json({ objeto });
    }

    // ── Enriquecimento ────────────────────────────────────────────
    if (!formData || !company) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const { data: companyData } = await supabase
      .from('companies').select('id')
      .eq('id', company.id).eq('user_id', user.id).single();

    if (!companyData) {
      return NextResponse.json({ error: 'Empresa não autorizada' }, { status: 403 });
    }

    // HTML gerado no servidor — não precisa vir no payload do cliente
    const contratoBase = generateContractHTML(formData, company, 'CC-PREVIEW');

    const resultado = await enrichContractWithAI({ formData, company, contratoBase });

    // Persistir no banco se tiver contract_id (erro silencioso)
    if (contract_id) {
      await supabase.from('contracts').update({
        status:               'revisado_ia',
        ia_revisado:          true,
        ia_revisado_em:       new Date().toISOString(),
        ia_sugestoes:         resultado.sugestoes,
        ia_tokens_usados:     resultado.tokens_usados,
        nivel_risco:          resultado.nivel_risco,
        clausulas_ajustadas:  resultado.clausulas_ajustadas,
        checklist_mesa:       resultado.checklist_mesa,
        contrato_revisado_ia: resultado.contrato_html,
      }).eq('id', contract_id).eq('company_id', company.id);
    }

    // Log de IA
    await supabase.from('ai_logs').insert({
      company_id:        company.id,
      tipo:              'revisao',
      prompt_tokens:     Math.floor(resultado.tokens_usados * 0.65),
      completion_tokens: Math.floor(resultado.tokens_usados * 0.35),
      total_tokens:      resultado.tokens_usados,
      modelo:            process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      versao_modelo:     process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      nivel_risco_retornado: resultado.nivel_risco,
      sucesso:           true,
    });

    return NextResponse.json({
      contrato_html:        resultado.contrato_html,
      sugestoes:            resultado.sugestoes,
      riscos_identificados: resultado.riscos_identificados,
      nivel_risco:          resultado.nivel_risco,
      checklist_mesa:       resultado.checklist_mesa,
      clausulas_ajustadas:  resultado.clausulas_ajustadas,
      clausulas_revisadas:  resultado.clausulas_revisadas,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao processar com IA.';
    console.error('[/api/claude]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
