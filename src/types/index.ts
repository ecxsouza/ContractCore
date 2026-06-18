// ================================================================
// ContractCore — Types
// FONTE ÚNICA DE VERDADE: status canônicos alinhados com constants.ts
// ================================================================

// ── ENUMS E UNION TYPES ──────────────────────────────────────────

export type PersonType = 'PJ' | 'MEI' | 'PF';

export type ProfessionType =
  | 'psicologo' | 'neuropsicologo' | 'fonoaudiologo'
  | 'psicopedagogo' | 'secretaria' | 'recepcionista'
  | 'coordenador' | 'outro';

export type ModalityType = 'presencial' | 'online' | 'hibrido';

export type RemunerationModel =
  | 'por_atendimento' | 'por_hora' | 'por_plantao'
  | 'percentual' | 'pacote' | 'reembolso' | 'bonus' | 'outro';

export type PaymentMethod = 'pix' | 'transferencia' | 'boleto' | 'dinheiro' | 'outro';

// 9 status canônicos — alinhados com constants.ts e migration 005
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

export type AIStatus = 'disponivel' | 'processando' | 'indisponivel' | 'revisado';

// ── EMPRESA CONTRATANTE ──────────────────────────────────────────

export interface Company {
  id:                   string;
  user_id:              string;
  razao_social:         string;
  nome_fantasia?:       string;
  cnpj:                 string;
  inscricao_municipal?: string;
  inscricao_estadual?:  string;
  responsavel_legal:    string;
  cargo_responsavel?:   string;
  cpf_responsavel?:     string;
  cep:                  string;
  logradouro:           string;
  numero:               string;
  complemento?:         string;
  bairro:               string;
  cidade:               string;
  uf:                   string;
  email:                string;
  telefone?:            string;
  pix_key?:             string;
  banco?:               string;
  agencia?:             string;
  conta?:               string;
  tipo_conta?:          string;
  logo_url?:            string;
  created_at?:          string;
  updated_at?:          string;
}

// ── PRESTADOR DE SERVIÇOS ────────────────────────────────────────

export interface ServiceProvider {
  id:                       string;
  company_id:               string;
  tipo_pessoa:              PersonType;
  nome_razao_social:        string;
  nome_fantasia?:           string;
  cpf?:                     string;
  cnpj?:                    string;
  rg?:                      string;
  inscricao_estadual?:      string;
  inscricao_municipal?:     string;
  profissao:                ProfessionType;
  profissao_descricao?:     string;
  especialidade?:           string;
  conselho_profissional?:   string;
  numero_registro_conselho?: string;
  cep:                      string;
  logradouro:               string;
  numero:                   string;
  complemento?:             string;
  bairro:                   string;
  cidade:                   string;
  uf:                       string;
  email:                    string;
  telefone:                 string;
  celular?:                 string;
  telefone_fixo?:           string;
  responsavel_legal?:       string;
  cpf_responsavel?:         string;
  estado_civil?:            string;
  nacionalidade?:           string;
  created_at?:              string;
  updated_at?:              string;
}

// ── DETALHES DO SERVIÇO ──────────────────────────────────────────

export interface ServiceDetails {
  objeto:                    string;
  descricao_servicos?:       string;
  local_prestacao:           string;
  modalidade:                ModalityType;
  periodicidade:             string;
  agenda_pactuada?:          string;
  exclusividade:             boolean;
  recursos_disponibilizados: string[];
  regra_cancelamento?:       string;
  regra_remarcacao?:         string;
}

// ── DETALHES DE REMUNERAÇÃO ──────────────────────────────────────

export interface RemunerationDetails {
  modelos:            RemunerationModel[];
  valor_descricao:    string;
  data_pagamento:     string;
  formas_pagamento:   PaymentMethod[];
  emite_nota_fiscal:  'obrigatorio' | 'dispensado_mei' | 'a_definir' | 'mei_dispensado' | 'conforme_legislacao';
  retencoes_fiscais?: string;
  reembolso_tipo?:    string;
  reembolso_descricao?: string;
}

// ── CONTRATO ─────────────────────────────────────────────────────

export interface Contract {
  id:                     string;
  company_id:             string;
  provider_id:            string;
  numero_contrato:        string;
  versao:                 number;
  status:                 ContractStatus;
  data_emissao:           string;
  data_vigencia_inicio?:  string;
  data_vigencia_fim?:     string;
  vigencia_indeterminada: boolean;
  service_details?:       ServiceDetails;
  remuneration?:          RemunerationDetails;
  anexos?:                AnexoType[];
  contrato_html?:         string;
  contrato_html_original?: string;
  contrato_revisado_ia?:  string;
  notas_internas?:        string;
  ia_revisado:            boolean;
  ia_revisado_em?:        string;
  ia_sugestoes?:          string;
  ia_tokens_usados?:      number;
  nivel_risco?:           'baixo' | 'medio' | 'alto';
  score_pejotizacao?:     number;
  checklist_mesa?:        ChecklistMesaItem[];
  clausulas_ajustadas?:   string[];
  assinado_contratante:   boolean;
  assinado_prestador:     boolean;
  data_assinatura_contratante?: string;
  data_assinatura_prestador?:   string;
  nome_assinante_contratante?:  string;
  nome_assinante_prestador?:    string;
  created_at?:            string;
  updated_at?:            string;
  service_providers?:     Partial<ServiceProvider>;
}

// ── VERSÃO DE CONTRATO ───────────────────────────────────────────

export interface ContractVersion {
  id:              string;
  contract_id:     string;
  versao:          number;
  contrato_html:   string;
  motivo_revisao?: string;
  created_at?:     string;
}

// ── ANEXOS ───────────────────────────────────────────────────────

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

export interface AnexoInfo {
  id:          AnexoType;
  titulo:      string;
  descricao:   string;
  recomendado: boolean;
}

// ── IA / MESA TÉCNICA ────────────────────────────────────────────

export interface RiscoItem {
  titulo:        string;
  descricao:     string;
  gravidade:     'atencao' | 'importante' | 'critico';
  como_corrigir: string;
  area:          string;
}

export interface ChecklistMesaItem {
  area:       string;
  status:     'ok' | 'atencao' | 'problema';
  observacao: string;
}

// ── AI LOG ───────────────────────────────────────────────────────

export interface AILog {
  id:                    string;
  company_id:            string;
  tipo:                  'revisao' | 'sugestao_objeto' | 'sugestao_clausula' | 'analise_risco';
  prompt_tokens:         number;
  completion_tokens:     number;
  total_tokens:          number;
  modelo:                string;
  versao_modelo?:        string;
  nivel_risco_retornado?: string;
  custo_estimado_usd?:   number;
  sucesso:               boolean;
  created_at?:           string;
}


// ── CLÁUSULA REVISADA PELA IA ────────────────────────────────────

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

// ── FORM DATA (wizard) ───────────────────────────────────────────

export interface ContractFormData {
  // Step 1 — Prestador
  provider: Omit<ServiceProvider, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
  // Step 2 — Serviço
  service: ServiceDetails;
  // Step 3 — Remuneração
  remuneration: RemunerationDetails;
  // Step 4 — Anexos & Revisão
  anexos: AnexoType[];
  vigencia_indeterminada: boolean;
  data_vigencia_inicio?: string;
  data_vigencia_fim?:    string;
  notas_internas?:       string;
  // Revisão IA aceita — propagada do Step4 para o save
  ia_aceita?:            boolean;
  ia_contrato_html?:     string;
  ia_sugestoes?:         string;
  ia_nivel_risco?:       'baixo' | 'medio' | 'alto';
  ia_checklist_mesa?:    ChecklistMesaItem[];
  ia_clausulas_revisadas?: ClausulaRevisada[];
  ia_riscos?:            RiscoItem[];
}

// ── CNPJ API RESPONSE ─────────────────────────────────────────────

export interface CNPJData {
  razao_social:       string;
  nome_fantasia?:     string;
  cnpj:               string;
  situacao_cadastral: string;
  data_abertura:      string;
  porte?:             string;
  natureza_juridica?: string;
  logradouro?:        string;
  numero?:            string;
  complemento?:       string;
  bairro?:            string;
  municipio?:         string;
  uf?:                string;
  cep?:               string;
  email?:             string;
  telefone?:          string;
}

// ── CEP API RESPONSE ──────────────────────────────────────────────

export interface CEPData {
  cep:         string;
  logradouro:  string;
  complemento?: string;
  bairro:      string;
  localidade:  string;
  uf:          string;
  erro?:       boolean;
}

// ── UI / WIZARD ───────────────────────────────────────────────────

export interface WizardStep {
  id:       number;
  titulo:   string;
  descricao: string;
  icone:    string;
  completo: boolean;
}