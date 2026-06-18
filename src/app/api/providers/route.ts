export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/providers — listar prestadores da empresa
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('id').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ providers: [] });

  const { data } = await supabase
    .from('service_providers')
    .select(`
      id, nome_razao_social, nome_fantasia, tipo_pessoa,
      cpf, cnpj, rg, profissao, profissao_descricao, especialidade,
      conselho_profissional, numero_registro_conselho,
      cep, logradouro, numero, complemento, bairro, cidade, uf,
      email, telefone, celular, telefone_fixo,
      responsavel_legal, cpf_responsavel,
      estado_civil, nacionalidade, inscricao_estadual, inscricao_municipal
    `)
    .eq('company_id', company.id)
    .order('nome_razao_social');

  return NextResponse.json({ providers: data || [] });
}

// PUT /api/providers?id=xxx — atualizar prestador
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('id').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const id   = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const body = await request.json();

  const { data, error } = await supabase
    .from('service_providers')
    .update(body)
    .eq('id', id)
    .eq('company_id', company.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await supabase.from('audit_logs').insert({
      company_id: company.id, user_id: user.id,
      acao: 'provider.updated', tabela: 'service_providers', registro_id: id,
    });
  } catch (_) { /* silencioso */ }

  return NextResponse.json({ provider: data });
}

// DELETE /api/providers?id=xxx — excluir prestador (com verificação de contratos)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('id').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  // Verificar contratos vinculados
  const { data: contratos } = await supabase
    .from('contracts')
    .select('id, status, numero_contrato')
    .eq('provider_id', id)
    .eq('company_id', company.id);

  if (contratos && contratos.length > 0) {
    const soloRascunho = contratos.every(c => c.status === 'rascunho');
    return NextResponse.json({
      error: soloRascunho
        ? `Este prestador tem ${contratos.length} contrato(s) em rascunho. Exclua os contratos primeiro e tente novamente.`
        : `Não é possível excluir. Este prestador possui contratos ativos ou finalizados (${contratos.map(c => c.numero_contrato).join(', ')}). Apenas prestadores sem contratos podem ser excluídos.`,
      contratos,
      pode_excluir_contratos: soloRascunho,
    }, { status: 409 });
  }

  const { error } = await supabase
    .from('service_providers')
    .delete()
    .eq('id', id)
    .eq('company_id', company.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await supabase.from('audit_logs').insert({
      company_id: company.id, user_id: user.id,
      acao: 'provider.deleted', tabela: 'service_providers', registro_id: id,
    });
  } catch (_) { /* silencioso */ }

  return NextResponse.json({ success: true });
}
