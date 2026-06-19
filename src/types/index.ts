// ================================================================
// ContractCore — Tipos Globais
// Sincronizados com o banco de dados e constantes em lib/constants.ts
// ================================================================

// ── ENUMS ────────────────────────────────────────────────────────

export type PersonType = 'PJ' | 'MEI' | 'PF';

export type ProfessionType =
  | 'psicologo'
  | 'neuropsicologo'
  | 'fonoaudiologo'
  | 'psicopedagogo'
  | 'secretaria'
  | 'recepcionista'
  | 'coordenador'
  | 'outro';

export type ModalityType = 'presencial' | 'online' | 'hibrido';

export type RemunerationModel =
  | 'fixo_mensal'
  | 'por_atendimento'
  | 'por_hora'
  | 'por_plantao'
  | 'percentual'
  | 'pacote'
  | 'reembolso'
  | 'bonus'
  | 'outro';

export type PaymentMethod = 'pix' | 'transferencia' | 'boleto' | 'dinheiro' | 'outro';

// Status canônicos — snake_case, sem acento, sincronizados com o banco
export type ContractStatus =
  | 'rascunho'
  | 'em_revisao'
  | 'revisado_ia'
  | 'aguardando_aprovacao'
  | 'aguardando_assinatura'
  | 'assinado'
  | 'cancelado'
  | 'arquivado'
  | 'encerrado';

export type NivelRisco = 'baixo' | 'medio' | 'alto';

export type AIStatus = 'idle' | 'processing' | 'done' | 'error';

// ── EMPRESA CONTRATANTE ──────────────────────────────────────────

export interface Company {
  id:                   string;
  user_id:              string;
  razao_social:         string;
  nome_fantasia:        string;
  cnpj:                 string;
  inscricao_municipal?: string;
  inscricao_estadual?:  string;
  data_abertura?:       string;
  porte?:               string;
  natureza_juridica?:   string;
  atividade_principal?: string;
  cep:                  string;
  logradouro:           string;
  numero:               string;
  complemento?:         string;
  bairro:               string;
  cidade:               string;
  uf:                   string;
  email:                string;
  telefone:             string;
  responsavel_legal:    string;
  cpf_responsavel:      string;
  cargo_responsavel?:   string;
  logo_url?:            string;
  banco?:               string;
  agencia?:             string;
  conta?:               string;
  tipo_conta?:          'corrente' | 'poupanca';
  pix_key?:             string;
  created_at:           string;
  updated_at:           string;
}

// ── PRESTADOR DE SERVIÇOS ─────────────────────────────────────────

export interface ServiceProvider {
  id:                          string;
  company_id:                  string;
  tipo_pessoa:                 PersonType;
  nome_razao_social:           string;
  nome_fantasia?:              string;
  cpf?:                        string;
  cnpj?:                       string;
  rg?:                         string;
  inscricao_municipal?:        string;
  inscricao_estadual?:         string;
  profissao:                   ProfessionType;
  profissao_descricao?:        string;
  especialidade?:              string;
  conselho_profissional?:      string;
  numero_registro_conselho?:   string;
  cep:                         string;
  logradouro:                  string;
  numero:                      string;
  complemento?:                string;
  bairro:                      string;
  cidade:                      string;
  uf:                          string;
  email:                       string;
  telefone:                    string;
  celular?:                    string;
  telefone_fixo?:              string;
  responsavel_legal?:          string;
  cpf_responsavel?:            string;
  estado_civil?:               string;
  nacionalidade?:              string;
  created_at:                  string;
  updated_at:                  string;
}

// ── DADOS DA PRESTAÇÃO ────────────────────────────────────────────

export interface ServiceDetails {
  objeto:                       string;
  descricao_servicos?:          string;
  local_prestacao:              string;
  modalidade:                   ModalityType;
  periodicidade:                string;
  agenda_pactuada?:             string;
  horarios?:                    string;
  exclusividade:                boolean;
  recursos_disponibilizados:    string[];
  recursos_personalizados?:     string[];
  regra_cancelamento?:          string;
  regra_falta?:                 string;
  regra_atraso?:                string;
  regra_remarcacao?:            string;
  resp_materiais?:              string;
  resp_documentos?:             string;
  regra_comunicacao_pacientes?: string;
  regra_uso_marca?:             string;
  regra_redes_sociais?:         string;
  regra_captacao_pacientes?:    string;
  condutas_vedadas?:            string;
}

// ── REMUNERAÇÃO ───────────────────────────────────────────────────

export interface RemunerationDetails {
  modelos:              RemunerationModel[];
  valor_descricao:      string;
  valor_fixo_mensal?:   number;
  valor_por_atendimento?: number;
  valor_por_hora?:      number;
  percentual?:          number;
  data_pagamento:       string;
  formas_pagamento:     PaymentMethod[];
  forma_pagamento_outro_detalhe?: string;
  emite_nota_fiscal:    'obrigatorio' | 'dispensado_mei' | 'a_definir';
  retencoes_fiscais?:   string;
  reembolso_tipo?:      string;
  reembolso_descricao?: string;
}

// ── CONTRATO ──────────────────────────────────────────────────────

export interface Contract {
  id:                           string;
  company_id:                   string;
  provider_id:                  string;
  numero_contrato:              string;
  versao:                       number;
  status:                       ContractStatus;
  data_emissao:                 string;
  data_vigencia_inicio?:        string;
  data_vigencia_fim?:           string;
  vigencia_indeterminada:       boolean;
  service_details:              ServiceDetails;
  remuneration:                 RemunerationDetails;
  anexos:                       AnexoType[];
  contrato_html?:               string;
  contrato_html_original?:      string;
  contrato_revisado_ia?:        string;
  pdf_url?:                     string;
  ia_revisado:                  boolean;
  ia_revisado_em?:              string;
  ia_sugestoes?:                string;
  ia_tokens_usados?:            number;
  nivel_risco?:                 NivelRisco;
  score_pejotizacao?:           number;
  checklist_mesa?:              ChecklistMesaItem[];
  clausulas_ajustadas?:         string[];
  aprovado_em?:                 string;
  aprovado_por?:                string;
  assinado_contratante:         boolean;
  assinado_prestador:           boolean;
  data_assinatura_contratante?: string;
  data_assinatura_prestador?:   string;
  ip_assinatura_contratante?:   string;
  ip_assinatura_prestador?:     string;
  hash_documento?:              string;
  is_renovacao?:                boolean;
  contrato_original_id?:        string;
  notas_internas?:              string;
  arquivado_em?:                string;
  created_at:                   string;
  updated_at:                   string;
  company?:                     Company;
  service_providers?:           ServiceProvider;
}

// ── VERSÃO DE CONTRATO ────────────────────────────────────────────

export interface ContractVersion {
  id:                  string;
  contract_id:         string;
  versao:              number;
  contrato_html:       string;
  alteracoes_resumo?:  string;
  tipo_alteracao?:     'manual' | 'ia' | 'aprovacao' | 'assinatura';
  alterado_por?:       string;
  created_at:          string;
}

// ── CHECKLIST DA MESA TÉCNICA ─────────────────────────────────────

export interface ChecklistMesaItem {
  area:       string;
  status:     'ok' | 'atencao' | 'problema';
  observacao: string;
}

// ── RISCO IDENTIFICADO PELA IA ────────────────────────────────────

export interface RiscoItem {
  titulo:        string;
  descricao:     string;
  gravidade:     'atencao' | 'importante' | 'critico';
  como_corrigir: string;
  area?:         string;
  step?:         1 | 2 | 3;
  field?:        string;
  label?:        string;
}

// ── CLÁUSULA REVISADA PELA IA ─────────────────────────────────────

export interface ClausulaRevisada {
  id:             string;
  chave:          string;
  titulo:         string;
  problema:       string;
  texto_original: string;
  texto_revisado: string;
  motivo:         string;
  gravidade:      'atencao' | 'importante' | 'critico';
  area:           string;
}

// ── ANEXOS ────────────────────────────────────────────────────────

export type AnexoType =
  | 'confidencialidade'
  | 'lgpd'
  | 'prontuarios'
  | 'uso_estrutura'
  | 'politica_agenda'
  | 'sem_vinculo_clt'
  | 'checklist_pj_mei'
  | 'checklist_pejotizacao'
  | 'checklist_conselho'
  | 'ciencia_etica';

// ── FORMULÁRIO DE NOVO CONTRATO ───────────────────────────────────

export interface ContractFormData {
  provider:                Omit<ServiceProvider, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
  service:                 ServiceDetails;
  remuneration:            RemunerationDetails;
  anexos:                  AnexoType[];
  vigencia_indeterminada:  boolean;
  data_vigencia_inicio?:   string;
  data_vigencia_fim?:      string;
  notas_internas?:         string;
  // Revisão IA — propagada do Step4Review para /api/contracts
  ia_aceita?:              boolean;
  ia_contrato_html?:       string;
  ia_sugestoes?:           string;
  ia_nivel_risco?:         NivelRisco;
  ia_checklist_mesa?:      ChecklistMesaItem[];
  ia_clausulas_revisadas?: ClausulaRevisada[];
  ia_riscos?:              RiscoItem[];
}

// ── TEMPLATE DE CONTRATO ──────────────────────────────────────────

export interface ContractTemplate {
  id:                string;
  company_id?:       string | null;
  profissao:         ProfessionType;
  nome:              string;
  descricao?:        string;
  is_sistema:        boolean;
  provider_data?:    Partial<Pick<ServiceProvider, 'profissao' | 'profissao_descricao' | 'especialidade' | 'conselho_profissional'>>;
  service_data:      Partial<ServiceDetails>;
  remuneration_data: Partial<RemunerationDetails>;
  anexos_padrao:     AnexoType[];
  uso_count:         number;
  created_at:        string;
  updated_at:        string;
}

// ── ALERTAS DE COMPLIANCE ─────────────────────────────────────────

export type AlertType =
  | 'contrato_vencendo'
  | 'assinatura_pendente'
  | 'contrato_vencido'
  | 'registro_conselho';

export interface ComplianceAlert {
  id:              string;
  company_id:      string;
  contract_id?:    string;
  provider_id?:    string;
  tipo:            AlertType;
  titulo:          string;
  descricao?:      string;
  gravidade:       'atencao' | 'importante' | 'critico';
  resolvido:       boolean;
  resolvido_em?:   string;
  data_referencia?: string;
  created_at:      string;
  contracts?:      { numero_contrato: string; status: ContractStatus };
  service_providers?: { nome_razao_social: string };
}

// ── AUDITORIA ─────────────────────────────────────────────────────

export interface AuditLog {
  id:           string;
  company_id?:  string;
  user_id?:     string;
  acao:         string;
  tabela?:      string;
  registro_id?: string;
  dados_antes?: Record<string, unknown>;
  dados_depois?: Record<string, unknown>;
  ip?:          string;
  created_at:   string;
}

// ── CNPJ / CEP ────────────────────────────────────────────────────

export interface CNPJData {
  razao_social:        string;
  nome_fantasia?:      string;
  cnpj:                string;
  situacao_cadastral:  string;
  data_abertura:       string;
  porte:               string;
  natureza_juridica:   string;
  atividade_principal: string;
  logradouro:          string;
  numero:              string;
  complemento?:        string;
  bairro:              string;
  municipio:           string;
  uf:                  string;
  cep:                 string;
  email?:              string;
  telefone?:           string;
}

export interface CEPData {
  cep:          string;
  logradouro:   string;
  complemento?: string;
  bairro:       string;
  localidade:   string;
  uf:           string;
  erro?:        boolean;
}

// ── RELATÓRIO ─────────────────────────────────────────────────────

export interface ContractReport {
  numero_contrato:     string;
  prestador:           string;
  profissao:           string;
  tipo_pessoa:         string;
  status:              string;
  data_emissao:        string;
  vigencia:            string;
  valor_descricao:     string;
  modelos_remuneracao: string;
  ia_revisado:         boolean;
  nivel_risco:         string;
  assinado:            boolean;
  data_assinatura:     string;
}
