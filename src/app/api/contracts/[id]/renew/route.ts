import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateContractHTML } from '@/lib/pdf/generator';
import type { ContractFormData } from '@/types';

// ================================================================
// POST /api/contracts/[id]/renew
// Cria novo contrato baseado em um existente (renovação)
// ================================================================

export async function POST(
  request:  NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  // Buscar contrato original
  const { data: original } = await supabase
    .from('contracts')
    .select(`*, service_providers (*)`)
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (!original) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });

  const body    = await request.json();
  const { nova_vigencia_inicio, nova_vigencia_fim, vigencia_indeterminada, ajustes } = body as {
    nova_vigencia_inicio?:   string;
    nova_vigencia_fim?:      string;
    vigencia_indeterminada?: boolean;
    ajustes?:                Partial<{ service_details: any; remuneration: any }>;
  };

  // Gerar número do novo contrato
  const { data: numResult } = await supabase
    .rpc('generate_contract_number', { p_company_id: company.id });
  const novoNumero = numResult || `CC-${new Date().getFullYear()}-R${Date.now()}`;

  // Mesclar dados originais com ajustes opcionais
  const novoServiceDetails  = { ...(original.service_details  || {}), ...(ajustes?.service_details  || {}) };
  const novoRemuneration    = { ...(original.remuneration     || {}), ...(ajustes?.remuneration     || {}) };

  // Recriar formData para gerar o HTML
  const provider: any = original.service_providers;
  const formData: ContractFormData = {
    provider: {
      tipo_pessoa:              provider.tipo_pessoa,
      nome_razao_social:        provider.nome_razao_social,
      nome_fantasia:            provider.nome_fantasia,
      cpf:                      provider.cpf,
      cnpj:                     provider.cnpj,
      rg:                       provider.rg,
      profissao:                provider.profissao,
      profissao_descricao:      provider.profissao_descricao,
      especialidade:            provider.especialidade,
      conselho_profissional:    provider.conselho_profissional,
      numero_registro_conselho: provider.numero_registro_conselho,
      cep:                      provider.cep,
      logradouro:               provider.logradouro,
      numero:                   provider.numero,
      complemento:              provider.complemento,
      bairro:                   provider.bairro,
      cidade:                   provider.cidade,
      uf:                       provider.uf,
      email:                    provider.email,
      telefone:                 provider.telefone,
      nacionalidade:            provider.nacionalidade,
    },
    service:      novoServiceDetails as any,
    remuneration: novoRemuneration   as any,
    anexos:       original.anexos    || [],
    vigencia_indeterminada: vigencia_indeterminada ?? original.vigencia_indeterminada,
    data_vigencia_inicio:   nova_vigencia_inicio   || new Date().toISOString().split('T')[0],
    data_vigencia_fim:      nova_vigencia_fim       || undefined,
  };

  const contratoHtml = generateContractHTML(formData, company, novoNumero);

  // Criar novo contrato
  const { data: novoContrato, error } = await supabase
    .from('contracts')
    .insert({
      company_id:             company.id,
      provider_id:            original.provider_id,
      numero_contrato:        novoNumero,
      status:                 'rascunho',
      data_emissao:           new Date().toISOString().split('T')[0],
      data_vigencia_inicio:   formData.data_vigencia_inicio,
      data_vigencia_fim:      formData.data_vigencia_fim || null,
      vigencia_indeterminada: formData.vigencia_indeterminada,
      service_details:        novoServiceDetails,
      remuneration:           novoRemuneration,
      anexos:                 original.anexos || [],
      contrato_html:          contratoHtml,
      is_renovacao:           true,
      contrato_original_id:   original.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Encerrar contrato original
  await supabase
    .from('contracts')
    .update({ status: 'encerrado' })
    .eq('id', original.id);

  // Audit log
  try {
    await supabase.from('audit_logs').insert({
      company_id:  company.id,
      user_id:     user.id,
      acao:        'contract.renewed',
      tabela:      'contracts',
      registro_id: novoContrato.id,
    });
  } catch (_) {}

  return NextResponse.json({
    contract:         novoContrato,
    original_encerrado: true,
    numero_novo:      novoNumero,
  }, { status: 201 });
}
