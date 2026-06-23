// ================================================================
// ContractCore — Tipos do Módulo Termos de Pacientes
// Sincronizados com supabase/migrations/007_patient_terms.sql
//
// IMPORTANTE: Este módulo NÃO é prontuário eletrônico.
// É proibido adicionar campos de diagnóstico, CID, evolução clínica,
// plano terapêutico, conduta, medicação, laudo ou anotações de sessão.
// ================================================================

// ── UNIONS (alinhadas aos CHECK constraints da migration 007) ─────

export type PatientTermStatus =
  | 'rascunho'           // criado, não finalizado
  | 'ativo'              // salvo e em uso
  | 'pendente_assinatura'// enviado para assinatura (Fase 4)
  | 'assinado'           // assinatura coletada (Fase 4)
  | 'cancelado'          // encerrado antes do previsto
  | 'expirado'           // passou da data de revisão sem renovação
  | 'substituido';       // substituído por novo termo (histórico preservado)

export type PatientTermType =
  | 'particular_adulto'
  | 'particular_menor'
  | 'avaliacao_neuro'
  | 'online_adulto';
  // Fase 2: 'online_menor' | 'convenio_adulto' | 'convenio_menor'

export type PatientTermModalidade =
  | 'presencial'
  | 'online'
  | 'hibrido';

export type PatientTermTipoPagamento =
  | 'particular'
  | 'convenio'; // Fase 2 — apenas 'particular' na Fase 1

export type PatientTermNotaFiscal =
  | 'obrigatorio'
  | 'quando_solicitado'
  | 'nao_emite';

export type PatientResponsibleKinship =
  | 'mae'
  | 'pai'
  | 'avo'
  | 'tutor'
  | 'curador'
  | 'conjuge'
  | 'outro';

export type PatientTermAuditAction =
  | 'criado'
  | 'editado'
  | 'impresso'
  | 'cancelado'
  | 'assinado'
  | 'substituido'
  | 'expirado';

// ── INTERFACE: Patient ────────────────────────────────────────────
// Tabela: public.patients
// Apenas dados administrativos. Sem campos clínicos.

export interface Patient {
  id:                       string;
  company_id:               string;

  // Identificação
  nome_completo:            string;
  cpf?:                     string | null;
  rg?:                      string | null;
  data_nascimento?:         string | null; // DATE → string ISO
  telefone?:                string | null;
  email?:                   string | null;

  // Endereço
  cep?:                     string | null;
  logradouro?:              string | null;
  numero?:                  string | null;
  complemento?:             string | null;
  bairro?:                  string | null;
  cidade?:                  string | null;
  uf?:                      string | null;

  // Classificação administrativa
  is_menor:                 boolean;

  // Campo livre exclusivamente administrativo.
  // NÃO registrar diagnóstico, CID, evolução, conduta ou qualquer dado clínico.
  observacao_administrativa?: string | null;

  created_at:               string;
  updated_at:               string;
}

// ── INTERFACE: PatientResponsible ─────────────────────────────────
// Tabela: public.patient_responsibles
// Responsável legal e/ou financeiro do paciente.
// Um paciente pode ter múltiplos responsáveis com papéis diferentes.

export interface PatientResponsible {
  id:                       string;
  company_id:               string;
  patient_id:               string;

  // Identificação
  nome_completo:            string;
  cpf?:                     string | null;
  rg?:                      string | null;
  data_nascimento?:         string | null;
  telefone?:                string | null;
  email?:                   string | null;

  // Relação com o paciente
  grau_parentesco?:         PatientResponsibleKinship | null;

  // Papéis — podem se sobrepor na mesma pessoa
  is_responsavel_legal:     boolean;
  is_responsavel_financeiro: boolean;

  // Endereço (pode diferir do endereço do paciente)
  cep?:                     string | null;
  logradouro?:              string | null;
  numero?:                  string | null;
  complemento?:             string | null;
  bairro?:                  string | null;
  cidade?:                  string | null;
  uf?:                      string | null;

  created_at:               string;
  updated_at:               string;
}

// ── INTERFACE: PatientTermTemplate ───────────────────────────────
// Tabela: public.patient_term_templates
// company_id null = template do sistema; preenchido = template da empresa.

export interface PatientTermTemplate {
  id:            string;
  company_id?:   string | null; // null = template do sistema
  nome:          string;
  tipo:          PatientTermType;
  descricao?:    string | null;
  area_servico?: string | null;
  is_sistema:    boolean;
  template_data: Record<string, unknown>;
  created_at:    string;
  updated_at:    string;
}

// ── INTERFACE: PatientTerm ────────────────────────────────────────
// Tabela: public.patient_terms
// Entidade central do módulo. Snapshot dos dados no momento da criação.
// Sem campos clínicos.

export interface PatientTerm {
  id:            string;
  company_id:    string;
  patient_id:    string;
  template_id?:  string | null;

  numero_termo:  string;
  status:        PatientTermStatus;
  tipo_termo:    PatientTermType;

  // Dados do serviço
  area_servico?:             string | null;
  profissional_responsavel?: string | null;
  modalidade?:               PatientTermModalidade | null;

  // Responsáveis — IDs + snapshot de nome no momento da criação
  responsavel_legal_id?:      string | null;
  responsavel_legal_nome?:    string | null;
  responsavel_financeiro_id?: string | null;
  responsavel_financeiro_nome?: string | null;
  mesmo_responsavel:          boolean;

  // Serviço — detalhes administrativos
  local_atendimento?:       string | null;
  plataforma_online?:       string | null;
  frequencia?:              string | null;
  duracao_sessao?:          string | null;
  quantidade_sessoes?:      number | null;
  data_inicio_atendimento?: string | null;
  vigencia_indeterminada:   boolean;
  data_fim_atendimento?:    string | null;

  // Financeiro
  tipo_pagamento:        PatientTermTipoPagamento;
  valor_sessao?:         number | null;
  valor_pacote?:         number | null;
  forma_pagamento?:      string[] | null;
  vencimento_pagamento?: string | null;
  emite_nota_fiscal?:    PatientTermNotaFiscal | null;

  // Regras de atendimento
  regra_falta?:               string | null;
  regra_cancelamento?:        string | null;
  antecedencia_cancelamento?: string | null;
  regra_remarcacao?:          string | null;
  regra_atraso?:              string | null;
  regra_reajuste?:            string | null;
  periodicidade_reajuste?:    string | null;
  aviso_previo_reajuste?:     string | null;
  regra_encerramento?:        string | null;

  // Consentimentos — registram aceite no momento da geração
  consentimento_sigilo:             boolean;
  consentimento_lgpd:               boolean;
  consentimento_contato_admin:      boolean;
  consentimento_sem_promessa:       boolean;
  consentimento_online:             boolean; // só se modalidade online
  consentimento_responsavel_menor:  boolean; // só se is_menor

  // HTML gerado — dado contratual/administrativo, sem conteúdo clínico
  termo_html?:          string | null;
  termo_html_original?: string | null;

  // Datas de controle
  data_revisao_recomendada?: string | null; // created_at + 12 meses

  // Assinatura (Fase 4)
  data_assinatura?: string | null;
  signed_by?:       string | null;

  created_at: string;
  updated_at: string;

  // Relações opcionais (joins)
  patient?:  Patient;
  company?:  { razao_social: string; nome_fantasia: string };
}

// ── INTERFACE: PatientTermAuditLog ────────────────────────────────
// Tabela: public.patient_term_audit_logs
// Log imutável de ações sobre termos. Sem dados clínicos.

export interface PatientTermAuditLog {
  id:          string;
  company_id:  string;
  term_id:     string;
  acao:        PatientTermAuditAction;
  usuario_id?: string | null;
  detalhes?:   Record<string, unknown> | null;
  created_at:  string;
}

// ── FORM DATA — dados agrupados por domínio para o wizard ─────────
// Estrutura aninhada para facilitar o frontend.
// A API (Prompt D) converterá para as tabelas patients,
// patient_responsibles e patient_terms ao salvar.
//
// IMPORTANTE: campos abaixo são estritamente administrativos.
// Nenhum campo clínico deve ser adicionado a esta estrutura.

export interface PatientTermFormPaciente {
  nome_completo:            string;
  cpf:                      string;
  rg:                       string;
  data_nascimento:          string;
  telefone:                 string;
  email:                    string;

  // Endereço
  cep:           string;
  logradouro:    string;
  numero:        string;
  complemento:   string;
  bairro:        string;
  cidade:        string;
  uf:            string;

  is_menor:                 boolean;
  // Campo exclusivamente administrativo — NÃO registrar dados clínicos.
  observacao_administrativa: string;

  // ID do paciente quando selecionado de cadastro existente (evita duplicação)
  paciente_id_selecionado?: string;
}

export interface PatientTermFormResponsavel {
  nome_completo:  string;
  cpf:            string;
  rg:             string;
  telefone:       string;
  email:          string;
  grau_parentesco: PatientResponsibleKinship | '';

  // Endereço
  cep:         string;
  logradouro:  string;
  numero:      string;
  complemento: string;
  bairro:      string;
  cidade:      string;
  uf:          string;

  is_responsavel_legal:      boolean;
  is_responsavel_financeiro: boolean;

  // ID do responsável quando selecionado de cadastro existente
  responsavel_id_selecionado?: string;
}

export interface PatientTermFormServico {
  tipo_termo:              PatientTermType;
  area_servico:            string;
  profissional_responsavel: string;
  modalidade:              PatientTermModalidade;
  local_atendimento:       string;
  plataforma_online:       string; // preenchido apenas se modalidade === 'online'
  frequencia:              string;
  duracao_sessao:          string;
  data_inicio_atendimento: string;
  vigencia_indeterminada:  boolean;
  data_fim_atendimento:    string;
  quantidade_sessoes:      number | null; // para pacote/avaliação fechada
}

export interface PatientTermFormFinanceiro {
  tipo_pagamento:        PatientTermTipoPagamento;
  valor_sessao:          string; // string para input controlado; parseado na API
  valor_pacote:          string; // string para input controlado; parseado na API
  forma_pagamento:       string[];
  vencimento_pagamento:  string;
  emite_nota_fiscal:     PatientTermNotaFiscal | '';
}

export interface PatientTermFormRegras {
  regra_falta:               string;
  regra_cancelamento:        string;
  antecedencia_cancelamento: string;
  regra_remarcacao:          string;
  regra_atraso:              string;
  regra_reajuste:            string;
  periodicidade_reajuste:    string;
  aviso_previo_reajuste:     string;
  regra_encerramento:        string;
}

export interface PatientTermFormConsentimentos {
  consentimento_sigilo:             boolean;
  consentimento_lgpd:               boolean;
  consentimento_contato_admin:      boolean;
  consentimento_sem_promessa:       boolean;
  consentimento_online:             boolean; // exibido apenas se modalidade online
  consentimento_responsavel_menor:  boolean; // exibido apenas se is_menor
}

// Tipo raiz do formulário — agrupa os 6 domínios
export interface PatientTermFormData {
  paciente:           PatientTermFormPaciente;
  responsavel_legal:  PatientTermFormResponsavel;
  responsavel_financeiro: PatientTermFormResponsavel;
  mesmo_responsavel:  boolean; // se true, responsavel_financeiro é ignorado na API
  servico:            PatientTermFormServico;
  financeiro:         PatientTermFormFinanceiro;
  regras:             PatientTermFormRegras;
  consentimentos:     PatientTermFormConsentimentos;
}

// ── ESTADO INICIAL DO FORMULÁRIO ──────────────────────────────────
// Valores padrão seguros para inicializar o wizard.
// Refletem os defaults da migration e as práticas habituais de mercado.

const EMPTY_RESPONSAVEL: PatientTermFormResponsavel = {
  nome_completo:             '',
  cpf:                       '',
  rg:                        '',
  telefone:                  '',
  email:                     '',
  grau_parentesco:           '',
  cep:                       '',
  logradouro:                '',
  numero:                    '',
  complemento:               '',
  bairro:                    '',
  cidade:                    '',
  uf:                        '',
  is_responsavel_legal:      false,
  is_responsavel_financeiro: false,
};

export const EMPTY_PATIENT_TERM_FORM: PatientTermFormData = {
  paciente: {
    nome_completo:             '',
    cpf:                       '',
    rg:                        '',
    data_nascimento:           '',
    telefone:                  '',
    email:                     '',
    cep:                       '',
    logradouro:                '',
    numero:                    '',
    complemento:               '',
    bairro:                    '',
    cidade:                    '',
    uf:                        '',
    is_menor:                  false,
    observacao_administrativa: '',
  },

  responsavel_legal: {
    ...EMPTY_RESPONSAVEL,
    is_responsavel_legal:      true,
    is_responsavel_financeiro: true, // default: mesmo responsável
  },

  responsavel_financeiro: {
    ...EMPTY_RESPONSAVEL,
    is_responsavel_financeiro: true,
  },

  mesmo_responsavel: true,

  servico: {
    tipo_termo:               'particular_adulto',
    area_servico:             'psicologia',
    profissional_responsavel: '',
    modalidade:               'presencial',
    local_atendimento:        '',
    plataforma_online:        '',
    frequencia:               'semanal',
    duracao_sessao:           '50 minutos',
    data_inicio_atendimento:  '',
    vigencia_indeterminada:   true,
    data_fim_atendimento:     '',
    quantidade_sessoes:       null,
  },

  financeiro: {
    tipo_pagamento:       'particular',
    valor_sessao:         '',
    valor_pacote:         '',
    forma_pagamento:      ['pix'],
    vencimento_pagamento: 'no dia da sessão ou conforme combinado',
    emite_nota_fiscal:    'obrigatorio',
  },

  regras: {
    regra_falta:               'Sessão agendada e não cancelada com a antecedência mínima será cobrada integralmente.',
    regra_cancelamento:        'O cancelamento deve ser comunicado com antecedência mínima pelo WhatsApp ou e-mail.',
    antecedencia_cancelamento: '48 horas',
    regra_remarcacao:          'A remarcação está sujeita à disponibilidade de agenda do profissional.',
    regra_atraso:              'Atrasos não serão compensados com extensão do tempo de sessão.',
    regra_reajuste:            'O valor poderá ser reajustado com aviso prévio mínimo, respeitada a periodicidade mínima estabelecida.',
    periodicidade_reajuste:    'anual (mínimo 12 meses)',
    aviso_previo_reajuste:     '30 dias de antecedência',
    regra_encerramento:        'Qualquer das partes pode encerrar o atendimento mediante aviso prévio de 30 dias.',
  },

  consentimentos: {
    consentimento_sigilo:            false,
    consentimento_lgpd:              false,
    consentimento_contato_admin:     false,
    consentimento_sem_promessa:      false,
    consentimento_online:            false,
    consentimento_responsavel_menor: false,
  },
};
