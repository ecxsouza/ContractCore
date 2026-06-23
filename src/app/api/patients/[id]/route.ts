export const dynamic = 'force-dynamic';

// ================================================================
// ContractCore — /api/patients/[id]
// GET   : buscar paciente com responsáveis e termos
// PATCH : editar dados administrativos do paciente
// DELETE: excluir paciente (bloqueado com 409 se houver termos)
//
// company_id sempre vem da sessão — nunca do payload.
// Sem campos clínicos em nenhuma operação.
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Campos administrativos permitidos no PATCH — sem campos clínicos
const PATIENT_ALLOWED_FIELDS = [
  'nome_completo', 'cpf', 'rg', 'data_nascimento',
  'telefone', 'email',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
  'is_menor', 'observacao_administrativa',
] as const;

// ── GET /api/patients/[id] ────────────────────────────────────────
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

  const { data: patient, error: pError } = await supabase
    .from('patients')
    .select(`
      id, company_id,
      nome_completo, cpf, rg, data_nascimento,
      telefone, email,
      cep, logradouro, numero, complemento, bairro, cidade, uf,
      is_menor, observacao_administrativa,
      created_at, updated_at
    `)
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (pError || !patient) {
    return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
  }

  const { data: responsibles } = await supabase
    .from('patient_responsibles')
    .select(`
      id, company_id, patient_id,
      nome_completo, cpf, rg, data_nascimento,
      telefone, email, grau_parentesco,
      is_responsavel_legal, is_responsavel_financeiro,
      cep, logradouro, numero, complemento, bairro, cidade, uf,
      created_at, updated_at
    `)
    .eq('patient_id', id)
    .eq('company_id', company.id)
    .order('created_at');

  const { data: terms } = await supabase
    .from('patient_terms')
    .select(`
      id, numero_termo, status, tipo_termo, area_servico,
      modalidade, tipo_pagamento, valor_sessao, valor_pacote,
      data_inicio_atendimento, vigencia_indeterminada,
      data_revisao_recomendada, created_at, updated_at
    `)
    .eq('patient_id', id)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    patient,
    responsibles: responsibles || [],
    terms:        terms        || [],
  });
}

// ── PATCH /api/patients/[id] ──────────────────────────────────────
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

  const { data: existing } = await supabase
    .from('patients').select('id').eq('id', id).eq('company_id', company.id).single();
  if (!existing) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });

  const body = await request.json();
  const raw  = (body?.patient ?? {}) as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  for (const field of PATIENT_ALLOWED_FIELDS) {
    if (!(field in raw)) continue;
    const val = raw[field];
    updates[field] = (field === 'cpf' && (val === '' || val === null)) ? null : val;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
  }

  // Trim do nome antes de salvar
  if (typeof updates.nome_completo === 'string') {
    updates.nome_completo = updates.nome_completo.trim();
  }

  // Validação server-side: nome_completo não pode ser vazio
  if ('nome_completo' in updates && !updates.nome_completo) {
    return NextResponse.json(
      { error: 'Nome completo é obrigatório' },
      { status: 400 }
    );
  }

  const { data: patient, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', id)
    .eq('company_id', company.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ patient });
}

// ── DELETE /api/patients/[id] ─────────────────────────────────────
export async function DELETE(
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

  const { data: existing } = await supabase
    .from('patients').select('id').eq('id', id).eq('company_id', company.id).single();
  if (!existing) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });

  // Verificar termos vinculados — retornar 409 amigável antes do ON DELETE RESTRICT do banco
  const { count: termCount } = await supabase
    .from('patient_terms')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', id)
    .eq('company_id', company.id);

  if (termCount && termCount > 0) {
    return NextResponse.json({
      error: 'Não é possível excluir este paciente porque existem termos vinculados a ele. Exclua ou cancele os termos antes de remover o paciente.',
    }, { status: 409 });
  }

  // Excluir responsáveis (CASCADE já faria, mas ser explícito por segurança)
  await supabase.from('patient_responsibles')
    .delete().eq('patient_id', id).eq('company_id', company.id);

  const { error: delError } = await supabase.from('patients')
    .delete().eq('id', id).eq('company_id', company.id);

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
