export const dynamic = 'force-dynamic';

// ================================================================
// ContractCore — /api/patient-terms/[id]
// GET  : buscar termo da empresa com paciente, responsáveis e audit logs
// PATCH: atualizar status do termo (ativo, cancelado, substituido, expirado)
//
// Garante filtro por company_id em todas as operações.
// NÃO usa service role. NÃO edita HTML nesta fase.
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Status permitidos via PATCH nesta fase
const STATUS_PATCH_PERMITIDOS = ['ativo', 'cancelado', 'substituido', 'expirado'] as const;
type StatusPatch = typeof STATUS_PATCH_PERMITIDOS[number];

// Mapeamento de status → ação de audit log
const STATUS_PARA_ACAO: Record<StatusPatch, string> = {
  ativo:      'editado',
  cancelado:  'cancelado',
  substituido: 'substituido',
  expirado:   'expirado',
};

// ── GET /api/patient-terms/[id] ───────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('id').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const { id } = params;

  // Termo completo (inclui HTML para visualização/impressão)
  const { data: term, error: termError } = await supabase
    .from('patient_terms')
    .select(`
      id, company_id, patient_id, template_id,
      numero_termo, status, tipo_termo, area_servico,
      profissional_responsavel, modalidade,
      responsavel_legal_id, responsavel_legal_nome,
      responsavel_financeiro_id, responsavel_financeiro_nome,
      mesmo_responsavel,
      local_atendimento, plataforma_online,
      frequencia, duracao_sessao, quantidade_sessoes,
      data_inicio_atendimento, vigencia_indeterminada, data_fim_atendimento,
      tipo_pagamento, valor_sessao, valor_pacote,
      forma_pagamento, vencimento_pagamento, emite_nota_fiscal,
      regra_falta, regra_cancelamento, antecedencia_cancelamento,
      regra_remarcacao, regra_atraso, regra_reajuste,
      periodicidade_reajuste, aviso_previo_reajuste, regra_encerramento,
      consentimento_sigilo, consentimento_lgpd, consentimento_contato_admin,
      consentimento_sem_promessa, consentimento_online,
      consentimento_responsavel_menor,
      termo_html, termo_html_original,
      data_revisao_recomendada, data_assinatura, signed_by,
      created_at, updated_at
    `)
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (termError || !term) {
    return NextResponse.json({ error: 'Termo não encontrado' }, { status: 404 });
  }

  // Paciente vinculado
  const { data: patient } = await supabase
    .from('patients')
    .select(`
      id, nome_completo, cpf, rg, data_nascimento,
      telefone, email,
      cep, logradouro, numero, complemento, bairro, cidade, uf,
      is_menor, observacao_administrativa,
      created_at, updated_at
    `)
    .eq('id', term.patient_id)
    .eq('company_id', company.id)
    .single();

  // Responsáveis vinculados ao paciente
  const { data: responsibles } = await supabase
    .from('patient_responsibles')
    .select(`
      id, nome_completo, cpf, rg, telefone, email,
      grau_parentesco, is_responsavel_legal, is_responsavel_financeiro,
      cep, logradouro, numero, complemento, bairro, cidade, uf,
      created_at
    `)
    .eq('patient_id', term.patient_id)
    .eq('company_id', company.id)
    .order('created_at');

  // Audit logs do termo (mais recentes primeiro)
  const { data: auditLogs } = await supabase
    .from('patient_term_audit_logs')
    .select('id, acao, usuario_id, detalhes, created_at')
    .eq('term_id', id)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    term,
    patient:     patient   || null,
    responsibles: responsibles || [],
    audit_logs:  auditLogs || [],
  });
}

// ── PATCH /api/patient-terms/[id] ────────────────────────────────
// Permite apenas mudança de status nesta fase.
// Não edita HTML, dados clínicos ou financeiros.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('id').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const { id } = params;
  const body = await request.json();
  const novoStatus = body?.status as string | undefined;

  // Validar status
  if (!novoStatus || !(STATUS_PATCH_PERMITIDOS as readonly string[]).includes(novoStatus)) {
    return NextResponse.json({
      error: `Status inválido. Permitidos: ${STATUS_PATCH_PERMITIDOS.join(', ')}`,
    }, { status: 400 });
  }

  // Buscar status atual (para audit log e validação de company_id)
  const { data: termAtual, error: fetchError } = await supabase
    .from('patient_terms')
    .select('id, status')
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (fetchError || !termAtual) {
    return NextResponse.json({ error: 'Termo não encontrado' }, { status: 404 });
  }

  const statusAnterior = termAtual.status;

  // Atualizar status
  const { data: termAtualizado, error: updateError } = await supabase
    .from('patient_terms')
    .update({ status: novoStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', company.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit log — ação mapeada pelo status novo
  const acao = STATUS_PARA_ACAO[novoStatus as StatusPatch] || 'editado';
  try {
    await supabase.from('patient_term_audit_logs').insert({
      company_id: company.id,
      term_id:    id,
      acao,
      usuario_id: user.id,
      detalhes:   { status_anterior: statusAnterior, status_novo: novoStatus },
    });
  } catch (_) { /* silencioso — audit log não bloqueia a operação */ }

  return NextResponse.json({ term: termAtualizado });
}
