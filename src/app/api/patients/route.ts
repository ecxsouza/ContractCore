export const dynamic = 'force-dynamic';

// ================================================================
// ContractCore — /api/patients
// GET : listar pacientes da empresa autenticada (com busca por nome/CPF)
// POST: criar paciente administrativo
//
// NÃO aceita campos clínicos.
// company_id sempre vem da empresa autenticada — nunca do payload.
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Campos administrativos permitidos no cadastro de paciente.
// Campos clínicos são explicitamente excluídos.
const PATIENT_ALLOWED_FIELDS = [
  'nome_completo', 'cpf', 'rg', 'data_nascimento',
  'telefone', 'email',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
  'is_menor', 'observacao_administrativa',
] as const;

// ── GET /api/patients ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('id').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ patients: [] });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  let query = supabase
    .from('patients')
    .select(`
      id, company_id,
      nome_completo, cpf, rg, data_nascimento,
      telefone, email,
      cep, logradouro, numero, complemento, bairro, cidade, uf,
      is_menor, observacao_administrativa,
      created_at, updated_at
    `)
    .eq('company_id', company.id)
    .order('nome_completo');

  // Busca por nome ou CPF (parcial, case-insensitive)
  if (q) {
    query = query.or(`nome_completo.ilike.%${q}%,cpf.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ patients: data || [] });
}

// ── POST /api/patients ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('id').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const body = await request.json();
  const raw  = (body?.patient ?? {}) as Record<string, unknown>;

  // Validação mínima
  if (!raw.nome_completo || typeof raw.nome_completo !== 'string' || !raw.nome_completo.trim()) {
    return NextResponse.json({ error: 'Nome completo é obrigatório' }, { status: 400 });
  }

  // Montar payload apenas com campos permitidos — nunca campos clínicos.
  // company_id sempre vem da empresa autenticada.
  const payload: Record<string, unknown> = { company_id: company.id };
  for (const field of PATIENT_ALLOWED_FIELDS) {
    const val = raw[field];
    if (val === undefined) continue;
    // CPF vazio → null (índice único parcial no banco ignora nulos)
    if (field === 'cpf' && (val === '' || val === null)) {
      payload.cpf = null;
    } else {
      payload[field] = val;
    }
  }

  const { data: patient, error } = await supabase
    .from('patients')
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ patient }, { status: 201 });
}
