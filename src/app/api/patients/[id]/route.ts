export const dynamic = 'force-dynamic';

// ================================================================
// ContractCore — /api/patients/[id]
// GET: buscar paciente da empresa autenticada com responsáveis e termos
//
// Garante filtro por company_id — nunca retorna dados de outra empresa.
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  // Buscar paciente — filtro duplo: id + company_id (RLS + garantia extra)
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

  // Responsáveis vinculados
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

  // Termos vinculados (resumo — sem HTML completo)
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
