export const dynamic = 'force-dynamic';

// ================================================================
// ContractCore — /api/patient-terms
// GET : listar termos da empresa autenticada
// POST: criar termo de paciente completo
//
// NÃO usa service role.
// NÃO aceita campos clínicos.
// NÃO aceita convênio na Fase 1.
// company_id sempre vem da empresa autenticada.
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePatientTermHTML } from '@/lib/patientTerms/generator';
import type { PatientTermFormData, PatientTermType } from '@/lib/patientTerms/types';

// ── Helper: normaliza moeda BR antes de salvar no banco ──────────
// Cobre os formatos: '1200' | '1200.00' | '1200,00' | '1.200,00' | 'R$ 1.200,00'
// Não usa replaceAll — compatível com ES2017 (tsconfig do projeto).
function parseCurrencyToNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let raw = String(value)
    .trim()
    .split('R$').join('')
    .split('\u00A0').join('') // non-breaking space
    .split(' ').join('');

  if (!raw) return null;

  if (raw.includes(',')) {
    // Formato PT-BR: '1.200,00' ou '1200,00'
    // Remove pontos de milhar e troca vírgula por ponto decimal
    raw = raw.split('.').join('').split(',').join('.');
  } else if (raw.includes('.')) {
    // Sem vírgula: distingue ponto decimal ('1200.00') de ponto de milhar ('1.200')
    const parts = raw.split('.');
    const last  = parts[parts.length - 1];
    if (last.length > 2) {
      // Ex: '1.200' — ponto é separador de milhar, remover
      raw = raw.split('.').join('');
    }
    // Ex: '1200.00' ou '1200.5' — ponto é decimal, manter como está
  }

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

// Tipos permitidos na Fase 1
const TIPOS_FASE_1: PatientTermType[] = [
  'particular_adulto',
  'particular_menor',
  'avaliacao_neuro',
  'online_adulto',
];

// ── GET /api/patient-terms ────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('id').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ terms: [] });

  const { searchParams } = new URL(request.url);
  const statusFilter    = searchParams.get('status');
  const patientIdFilter = searchParams.get('patient_id');

  let query = supabase
    .from('patient_terms')
    .select(`
      id, numero_termo, status, tipo_termo, area_servico,
      profissional_responsavel, modalidade, tipo_pagamento,
      valor_sessao, valor_pacote, data_inicio_atendimento,
      vigencia_indeterminada, data_revisao_recomendada,
      mesmo_responsavel, responsavel_legal_nome, responsavel_financeiro_nome,
      created_at, updated_at,
      patients ( nome_completo, cpf, is_menor )
    `)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  if (statusFilter)    query = query.eq('status',     statusFilter);
  if (patientIdFilter) query = query.eq('patient_id', patientIdFilter);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ terms: data || [] });
}

// ── POST /api/patient-terms ───────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const body = await request.json();
  const formData = body?.formData as PatientTermFormData;

  if (!formData) {
    return NextResponse.json({ error: 'Payload inválido: formData obrigatório' }, { status: 400 });
  }

  const { paciente, responsavel_legal, responsavel_financeiro, mesmo_responsavel,
          servico, financeiro, consentimentos } = formData;

  // ── 1. Validações de negócio ─────────────────────────────────────

  // Convênio proibido na Fase 1
  if (financeiro.tipo_pagamento === 'convenio') {
    return NextResponse.json({
      error: 'Convênio não disponível na Fase 1. Selecione "Particular".',
    }, { status: 400 });
  }

  // Tipo de termo dentro dos permitidos
  if (!TIPOS_FASE_1.includes(servico.tipo_termo)) {
    return NextResponse.json({
      error: `Tipo de termo inválido. Permitidos: ${TIPOS_FASE_1.join(', ')}`,
    }, { status: 400 });
  }

  // Nome completo do paciente obrigatório
  if (!paciente.nome_completo?.trim()) {
    return NextResponse.json({ error: 'Nome completo do paciente é obrigatório' }, { status: 400 });
  }

  // Menor: responsável legal obrigatório
  if (paciente.is_menor) {
    if (!responsavel_legal.nome_completo?.trim()) {
      return NextResponse.json({
        error: 'Nome completo do responsável legal é obrigatório para menor de idade',
      }, { status: 400 });
    }
    if (!responsavel_legal.cpf?.trim()) {
      return NextResponse.json({
        error: 'CPF do responsável legal é obrigatório para menor de idade',
      }, { status: 400 });
    }
    if (!consentimentos.consentimento_responsavel_menor) {
      return NextResponse.json({
        error: 'Consentimento do responsável legal é obrigatório para menor de idade',
      }, { status: 400 });
    }
  }

  // Responsável financeiro diferente: dados obrigatórios
  if (!mesmo_responsavel) {
    if (!responsavel_financeiro.nome_completo?.trim()) {
      return NextResponse.json({
        error: 'Nome completo do responsável financeiro é obrigatório',
      }, { status: 400 });
    }
    if (!responsavel_financeiro.cpf?.trim()) {
      return NextResponse.json({
        error: 'CPF do responsável financeiro é obrigatório',
      }, { status: 400 });
    }
  }

  // Consentimentos obrigatórios
  const consentObrigatorios: Array<keyof typeof consentimentos> = [
    'consentimento_sigilo',
    'consentimento_lgpd',
    'consentimento_contato_admin',
    'consentimento_sem_promessa',
  ];
  for (const c of consentObrigatorios) {
    if (!consentimentos[c]) {
      return NextResponse.json({
        error: `Consentimento obrigatório não marcado: ${c}`,
      }, { status: 400 });
    }
  }
  if (servico.modalidade === 'online' && !consentimentos.consentimento_online) {
    return NextResponse.json({
      error: 'Consentimento para atendimento online é obrigatório',
    }, { status: 400 });
  }

  // ── 2. Criar ou reutilizar paciente ──────────────────────────────
  // Reutiliza se o formulário trouxer paciente_id_selecionado (igual ao
  // padrão de provider_id_selecionado nos contratos de prestadores).
  let patientId: string;

  if (paciente.paciente_id_selecionado) {
    const { data: existente } = await supabase
      .from('patients')
      .select('id')
      .eq('id', paciente.paciente_id_selecionado)
      .eq('company_id', company.id)
      .single();
    if (existente) {
      patientId = existente.id;
    } else {
      return NextResponse.json({ error: 'Paciente selecionado não encontrado' }, { status: 404 });
    }
  } else {
    // Tentar reutilizar por CPF (se informado)
    let patientExistente: { id: string } | null = null;
    if (paciente.cpf?.trim()) {
      const { data } = await supabase
        .from('patients')
        .select('id')
        .eq('company_id', company.id)
        .eq('cpf', paciente.cpf.trim())
        .maybeSingle();
      if (data) patientExistente = data;
    }

    if (patientExistente) {
      patientId = patientExistente.id;
    } else {
      const { data: novoPatient, error: pErr } = await supabase
        .from('patients')
        .insert({
          company_id:               company.id,
          nome_completo:            paciente.nome_completo.trim(),
          cpf:                      paciente.cpf?.trim() || null,
          rg:                       paciente.rg?.trim()  || null,
          data_nascimento:          paciente.data_nascimento || null,
          telefone:                 paciente.telefone || null,
          email:                    paciente.email    || null,
          cep:                      paciente.cep      || null,
          logradouro:               paciente.logradouro || null,
          numero:                   paciente.numero   || null,
          complemento:              paciente.complemento || null,
          bairro:                   paciente.bairro   || null,
          cidade:                   paciente.cidade   || null,
          uf:                       paciente.uf       || null,
          is_menor:                 paciente.is_menor ?? false,
          observacao_administrativa: paciente.observacao_administrativa?.trim() || null,
        })
        .select('id')
        .single();
      if (pErr || !novoPatient) {
        return NextResponse.json({ error: pErr?.message || 'Erro ao criar paciente' }, { status: 500 });
      }
      patientId = novoPatient.id;
    }
  }

  // ── 3. Criar responsável legal ────────────────────────────────────
  let respLegalId: string | null = null;
  let respLegalNome: string | null = null;

  if (paciente.is_menor && responsavel_legal.nome_completo?.trim()) {
    let respExistente: { id: string } | null = null;
    if (responsavel_legal.responsavel_id_selecionado) {
      const { data } = await supabase
        .from('patient_responsibles')
        .select('id')
        .eq('id', responsavel_legal.responsavel_id_selecionado)
        .eq('company_id', company.id)
        .eq('patient_id', patientId) // garante que pertence ao paciente atual
        .single();
      if (!data) {
        return NextResponse.json(
          { error: 'Responsável selecionado não pertence ao paciente informado.' },
          { status: 400 }
        );
      }
      respExistente = data;
    } else if (responsavel_legal.cpf?.trim()) {
      const { data } = await supabase
        .from('patient_responsibles')
        .select('id')
        .eq('company_id', company.id)
        .eq('patient_id', patientId)
        .eq('cpf', responsavel_legal.cpf.trim())
        .maybeSingle();
      if (data) respExistente = data;
    }

    if (respExistente) {
      respLegalId   = respExistente.id;
      respLegalNome = responsavel_legal.nome_completo.trim();
    } else {
      const { data: novoResp, error: rErr } = await supabase
        .from('patient_responsibles')
        .insert({
          company_id:               company.id,
          patient_id:               patientId,
          nome_completo:            responsavel_legal.nome_completo.trim(),
          cpf:                      responsavel_legal.cpf?.trim()  || null,
          rg:                       responsavel_legal.rg?.trim()   || null,
          telefone:                 responsavel_legal.telefone     || null,
          email:                    responsavel_legal.email        || null,
          grau_parentesco:          responsavel_legal.grau_parentesco || null,
          is_responsavel_legal:     true,
          is_responsavel_financeiro: mesmo_responsavel,
          cep:                      responsavel_legal.cep        || null,
          logradouro:               responsavel_legal.logradouro || null,
          numero:                   responsavel_legal.numero     || null,
          complemento:              responsavel_legal.complemento || null,
          bairro:                   responsavel_legal.bairro     || null,
          cidade:                   responsavel_legal.cidade     || null,
          uf:                       responsavel_legal.uf         || null,
        })
        .select('id')
        .single();
      if (rErr || !novoResp) {
        return NextResponse.json({ error: rErr?.message || 'Erro ao criar responsável legal' }, { status: 500 });
      }
      respLegalId   = novoResp.id;
      respLegalNome = responsavel_legal.nome_completo.trim();
    }
  }

  // ── 4. Criar responsável financeiro (se diferente do legal) ──────
  let respFinId: string | null   = null;
  let respFinNome: string | null = null;

  if (!mesmo_responsavel && responsavel_financeiro.nome_completo?.trim()) {
    let respFinExistente: { id: string } | null = null;
    if (responsavel_financeiro.responsavel_id_selecionado) {
      const { data } = await supabase
        .from('patient_responsibles')
        .select('id')
        .eq('id', responsavel_financeiro.responsavel_id_selecionado)
        .eq('company_id', company.id)
        .eq('patient_id', patientId) // garante que pertence ao paciente atual
        .single();
      if (!data) {
        return NextResponse.json(
          { error: 'Responsável selecionado não pertence ao paciente informado.' },
          { status: 400 }
        );
      }
      respFinExistente = data;
    } else if (responsavel_financeiro.cpf?.trim()) {
      const { data } = await supabase
        .from('patient_responsibles')
        .select('id')
        .eq('company_id', company.id)
        .eq('patient_id', patientId)
        .eq('cpf', responsavel_financeiro.cpf.trim())
        .maybeSingle();
      if (data) respFinExistente = data;
    }

    if (respFinExistente) {
      respFinId   = respFinExistente.id;
      respFinNome = responsavel_financeiro.nome_completo.trim();
    } else {
      const { data: novoRespFin, error: rfErr } = await supabase
        .from('patient_responsibles')
        .insert({
          company_id:               company.id,
          patient_id:               patientId,
          nome_completo:            responsavel_financeiro.nome_completo.trim(),
          cpf:                      responsavel_financeiro.cpf?.trim()  || null,
          rg:                       responsavel_financeiro.rg?.trim()   || null,
          telefone:                 responsavel_financeiro.telefone     || null,
          email:                    responsavel_financeiro.email        || null,
          grau_parentesco:          responsavel_financeiro.grau_parentesco || null,
          is_responsavel_legal:     false,
          is_responsavel_financeiro: true,
          cep:                      responsavel_financeiro.cep        || null,
          logradouro:               responsavel_financeiro.logradouro || null,
          numero:                   responsavel_financeiro.numero     || null,
          complemento:              responsavel_financeiro.complemento || null,
          bairro:                   responsavel_financeiro.bairro     || null,
          cidade:                   responsavel_financeiro.cidade     || null,
          uf:                       responsavel_financeiro.uf         || null,
        })
        .select('id')
        .single();
      if (rfErr || !novoRespFin) {
        return NextResponse.json({ error: rfErr?.message || 'Erro ao criar responsável financeiro' }, { status: 500 });
      }
      respFinId   = novoRespFin.id;
      respFinNome = responsavel_financeiro.nome_completo.trim();
    }
  } else if (mesmo_responsavel && respLegalId) {
    // Mesmo responsável: reutiliza ID e nome do legal
    respFinId   = respLegalId;
    respFinNome = respLegalNome;
  }

  // ── 5. Validar template_id (quando informado) ────────────────────
  // Se template_id vier no payload:
  //   - não encontrado no banco → 400
  //   - não é do sistema nem da empresa → 403
  // Se não vier: prossegue sem template (usa tipo_termo).
  let templateId: string | null = body?.formData?.template_id ?? null;
  if (templateId) {
    const { data: tpl, error: tplError } = await supabase
      .from('patient_term_templates')
      .select('id, is_sistema, company_id')
      .eq('id', templateId)
      .single();
    if (tplError || !tpl) {
      return NextResponse.json({ error: 'Template informado não encontrado.' }, { status: 400 });
    }
    if (!tpl.is_sistema && tpl.company_id !== company.id) {
      return NextResponse.json(
        { error: 'Template informado não pertence à empresa autenticada.' },
        { status: 403 }
      );
    }
  }

  // ── 6. Gerar número do termo via RPC ─────────────────────────────
  const { data: numResult } = await supabase
    .rpc('generate_patient_term_number', { p_company_id: company.id });
  const numeroTermo: string = numResult || `TP-${new Date().getFullYear()}-${Date.now()}`;

  // ── 7. Gerar HTML do termo ───────────────────────────────────────
  const termoHtml = generatePatientTermHTML(formData, company, numeroTermo);

  // ── 8. Calcular data de revisão recomendada (hoje + 12 meses) ────
  const hoje = new Date();
  const dataRevisao = new Date(hoje.getFullYear() + 1, hoje.getMonth(), hoje.getDate());
  const dataRevisaoStr = dataRevisao.toISOString().split('T')[0];

  // ── 9. Inserir patient_term ──────────────────────────────────────
  const { data: term, error: termError } = await supabase
    .from('patient_terms')
    .insert({
      company_id:                     company.id,
      patient_id:                     patientId,
      template_id:                    templateId,
      numero_termo:                   numeroTermo,
      status:                         'ativo',
      tipo_termo:                     servico.tipo_termo,
      area_servico:                   servico.area_servico        || null,
      profissional_responsavel:       servico.profissional_responsavel || null,
      modalidade:                     servico.modalidade          || null,
      responsavel_legal_id:           respLegalId,
      responsavel_legal_nome:         respLegalNome,
      responsavel_financeiro_id:      respFinId,
      responsavel_financeiro_nome:    respFinNome,
      mesmo_responsavel:              mesmo_responsavel ?? true,
      local_atendimento:              servico.local_atendimento   || null,
      plataforma_online:              servico.plataforma_online   || null,
      frequencia:                     servico.frequencia          || null,
      duracao_sessao:                 servico.duracao_sessao      || null,
      quantidade_sessoes:             servico.quantidade_sessoes  ?? null,
      data_inicio_atendimento:        servico.data_inicio_atendimento || null,
      vigencia_indeterminada:         servico.vigencia_indeterminada ?? true,
      data_fim_atendimento:           servico.data_fim_atendimento || null,
      tipo_pagamento:                 financeiro.tipo_pagamento   || 'particular',
      valor_sessao:                   parseCurrencyToNumber(financeiro.valor_sessao),
      valor_pacote:                   parseCurrencyToNumber(financeiro.valor_pacote),
      forma_pagamento:                financeiro.forma_pagamento  || null,
      vencimento_pagamento:           financeiro.vencimento_pagamento || null,
      emite_nota_fiscal:              financeiro.emite_nota_fiscal || null,
      regra_falta:                    formData.regras.regra_falta               || null,
      regra_cancelamento:             formData.regras.regra_cancelamento        || null,
      antecedencia_cancelamento:      formData.regras.antecedencia_cancelamento || null,
      regra_remarcacao:               formData.regras.regra_remarcacao          || null,
      regra_atraso:                   formData.regras.regra_atraso              || null,
      regra_reajuste:                 formData.regras.regra_reajuste            || null,
      periodicidade_reajuste:         formData.regras.periodicidade_reajuste    || null,
      aviso_previo_reajuste:          formData.regras.aviso_previo_reajuste     || null,
      regra_encerramento:             formData.regras.regra_encerramento        || null,
      consentimento_sigilo:           consentimentos.consentimento_sigilo            ?? false,
      consentimento_lgpd:             consentimentos.consentimento_lgpd              ?? false,
      consentimento_contato_admin:    consentimentos.consentimento_contato_admin     ?? false,
      consentimento_sem_promessa:     consentimentos.consentimento_sem_promessa      ?? false,
      consentimento_online:           consentimentos.consentimento_online            ?? false,
      consentimento_responsavel_menor: consentimentos.consentimento_responsavel_menor ?? false,
      termo_html:                     termoHtml,
      termo_html_original:            termoHtml, // preservado mesmo em edições futuras
      data_revisao_recomendada:       dataRevisaoStr,
    })
    .select()
    .single();

  if (termError) {
    console.error('[patient-terms] insert error:', termError);
    return NextResponse.json({ error: termError.message }, { status: 500 });
  }

  // ── 10. Audit log ─────────────────────────────────────────────────
  // Padrão do projeto: try/catch silencioso para não bloquear a resposta.
  try {
    await supabase.from('patient_term_audit_logs').insert({
      company_id: company.id,
      term_id:    term.id,
      acao:       'criado',
      usuario_id: user.id,
      detalhes:   { numero_termo: numeroTermo, tipo_termo: servico.tipo_termo },
    });
  } catch (_) { /* silencioso — audit log não bloqueia criação */ }

  return NextResponse.json({ term, patient_id: patientId }, { status: 201 });
}
