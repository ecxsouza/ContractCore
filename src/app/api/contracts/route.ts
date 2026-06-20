export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateContractHTML } from '@/lib/pdf/generator';
import type { ContractFormData } from '@/types';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('id').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const status  = searchParams.get('status');
  const page    = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '20');
  const offset  = (page - 1) * perPage;

  let query = supabase
    .from('contracts')
    .select(`
      id, numero_contrato, versao, status,
      data_emissao, data_vigencia_inicio, data_vigencia_fim,
      ia_revisado, assinado_contratante, assinado_prestador,
      created_at, updated_at,
      service_providers (nome_razao_social, profissao, especialidade)
    `, { count: 'exact' })
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (status) query = query.eq('status', status);
  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contracts: data, total: count, page, per_page: perPage });
}

const PROVIDER_DB_FIELDS = [
  'company_id', 'tipo_pessoa', 'nome_razao_social', 'nome_fantasia',
  'cpf', 'cnpj', 'rg', 'inscricao_municipal', 'inscricao_estadual',
  'profissao', 'profissao_descricao', 'especialidade',
  'conselho_profissional', 'numero_registro_conselho',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
  'email', 'telefone', 'celular', 'telefone_fixo',
  'responsavel_legal', 'cpf_responsavel',
  'estado_civil', 'nacionalidade',
];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const body = await request.json();
  const { formData } = body as { formData: ContractFormData };
  const providerRaw = formData.provider as any;

  // ── Reutilização de prestador existente (evita duplicação) ─────────
  // 1) Se o usuário selecionou "Usar prestador já cadastrado", reutiliza
  //    o ID diretamente (validando que pertence a esta empresa).
  // 2) Caso contrário, antes de criar um novo registro, verifica se já
  //    existe prestador com o mesmo CPF (PF) ou CNPJ (PJ/MEI) cadastrado
  //    nesta empresa, e reutiliza se encontrar — e-mail é fallback apenas
  //    quando não há documento informado.
  let provider: any = null;

  if (formData.provider_id_selecionado) {
    const { data: existente } = await supabase
      .from('service_providers')
      .select('*')
      .eq('id', formData.provider_id_selecionado)
      .eq('company_id', company.id)
      .single();
    if (existente) provider = existente;
  }

  if (!provider) {
    const documento = providerRaw.tipo_pessoa === 'PF' ? providerRaw.cpf : providerRaw.cnpj;
    if (documento) {
      const campoDoc = providerRaw.tipo_pessoa === 'PF' ? 'cpf' : 'cnpj';
      const { data: porDocumento } = await supabase
        .from('service_providers')
        .select('*')
        .eq('company_id', company.id)
        .eq(campoDoc, documento)
        .maybeSingle();
      if (porDocumento) provider = porDocumento;
    } else if (providerRaw.email) {
      // Fallback secundário apenas quando não há CPF/CNPJ informado
      const { data: porEmail } = await supabase
        .from('service_providers')
        .select('*')
        .eq('company_id', company.id)
        .eq('email', providerRaw.email)
        .maybeSingle();
      if (porEmail) provider = porEmail;
    }
  }

  if (!provider) {
    // Montar payload apenas com campos do banco
    const providerPayload: Record<string, any> = { company_id: company.id };
    PROVIDER_DB_FIELDS.forEach(field => {
      if (field === 'company_id') return;
      if (field === 'telefone') {
        providerPayload.telefone = providerRaw.celular || providerRaw.telefone || '';
      } else if (providerRaw[field] !== undefined && providerRaw[field] !== null && providerRaw[field] !== '') {
        providerPayload[field] = providerRaw[field];
      }
    });

    // Garantir NOT NULL
    if (!providerPayload.cep)        providerPayload.cep        = '';
    if (!providerPayload.logradouro) providerPayload.logradouro = '';
    if (!providerPayload.numero)     providerPayload.numero     = 'S/N';
    if (!providerPayload.bairro)     providerPayload.bairro     = '';
    if (!providerPayload.cidade)     providerPayload.cidade     = '';
    if (!providerPayload.uf)         providerPayload.uf         = '';
    if (!providerPayload.email)      providerPayload.email      = '';
    if (!providerPayload.telefone)   providerPayload.telefone   = '';

    const { data: novoProvider, error: providerError } = await supabase
      .from('service_providers')
      .insert(providerPayload)
      .select()
      .single();

    if (providerError) {
      console.error('[contracts] provider error:', providerError);
      return NextResponse.json({ error: providerError.message }, { status: 500 });
    }
    provider = novoProvider;
  }

  const { data: numResult } = await supabase
    .rpc('generate_contract_number', { p_company_id: company.id });
  const numeroContrato = numResult || `CC-${new Date().getFullYear()}-${Date.now()}`;

  // Contrato original gerado do formData
  const contratoHtmlOriginal = generateContractHTML(formData, company, numeroContrato);

  // Se usuário aceitou revisão da IA, usar versão revisada como contrato ativo.
  // O HTML revisado foi gerado na tela de pré-visualização com o placeholder
  // "CC-PREVIEW" (número real ainda não existia naquele momento). Agora que
  // numeroContrato já foi gerado, substitui todas as ocorrências antes de
  // salvar — sem regenerar o HTML nem perder as revisões da IA aplicadas.
  const iaAceita = formData.ia_aceita === true && !!formData.ia_contrato_html;
  const contratoHtmlRevisadoComNumero = iaAceita
    ? formData.ia_contrato_html!.split('CC-PREVIEW').join(numeroContrato)
    : null;
  const contratoHtmlFinal = iaAceita ? contratoHtmlRevisadoComNumero! : contratoHtmlOriginal;

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .insert({
      company_id:             company.id,
      provider_id:            provider.id,
      numero_contrato:        numeroContrato,
      status:                 iaAceita ? 'revisado_ia' : 'rascunho',
      data_emissao:           new Date().toISOString().split('T')[0],
      data_vigencia_inicio:   formData.data_vigencia_inicio || null,
      data_vigencia_fim:      formData.data_vigencia_fim    || null,
      vigencia_indeterminada: formData.vigencia_indeterminada ?? true,
      service_details:        formData.service,
      remuneration:           formData.remuneration,
      anexos:                 formData.anexos,
      contrato_html:          contratoHtmlFinal,
      contrato_html_original: contratoHtmlOriginal,
      contrato_revisado_ia:   iaAceita ? contratoHtmlRevisadoComNumero : null,
      notas_internas:         formData.notas_internas || null,
      // Campos IA persistidos quando revisão foi aceita
      ia_revisado:            iaAceita,
      ia_revisado_em:         iaAceita ? new Date().toISOString() : null,
      ia_sugestoes:           formData.ia_sugestoes || null,
      nivel_risco:            formData.ia_nivel_risco || null,
      checklist_mesa:         formData.ia_checklist_mesa || null,
      clausulas_ajustadas:    (formData.ia_clausulas_revisadas || []).map((c: { titulo: string }) => c.titulo),
    })
    .select()
    .single();

  if (contractError) {
    console.error('[contracts] contract error:', contractError);
    return NextResponse.json({ error: contractError.message }, { status: 500 });
  }

  // Audit log — sem .catch() (não suportado pelo Supabase client)
  try {
    await supabase.from('audit_logs').insert({
      company_id:  company.id,
      user_id:     user.id,
      acao:        'contract.created',
      tabela:      'contracts',
      registro_id: contract.id,
      ip:          request.headers.get('x-forwarded-for') || null,
    });
  } catch (_) { /* silencioso */ }

  return NextResponse.json({ contract, provider }, { status: 201 });
}
