-- ================================================================
-- ContractCore — Migration 007 — Módulo Termos de Pacientes
-- IDEMPOTENTE: pode ser executada múltiplas vezes sem erros
-- Execute no SQL Editor do Supabase Dashboard
--
-- Este módulo NÃO é prontuário eletrônico.
-- Trata apenas dados administrativos, contratuais,
-- financeiros e consentimentos da relação clínica ↔ paciente.
--
-- É proibido armazenar neste módulo:
--   diagnóstico, CID, hipótese diagnóstica, evolução clínica,
--   plano terapêutico, medicação, conduta clínica, laudo clínico,
--   anotações de sessão, queixa clínica, histórico médico.
-- ================================================================


-- ── 1. TABELA: patients ──────────────────────────────────────────
-- Dados administrativos do paciente. Sem campos clínicos.

CREATE TABLE IF NOT EXISTS public.patients (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id                UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Identificação
  nome_completo             TEXT NOT NULL,
  cpf                       TEXT,
  rg                        TEXT,
  data_nascimento           DATE,
  telefone                  TEXT,
  email                     TEXT,

  -- Endereço
  cep                       TEXT,
  logradouro                TEXT,
  numero                    TEXT,
  complemento               TEXT,
  bairro                    TEXT,
  cidade                    TEXT,
  uf                        CHAR(2),

  -- Classificação administrativa
  is_menor                  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Campo livre exclusivamente administrativo
  -- NÃO registrar diagnóstico, CID, evolução clínica,
  -- relato do paciente, conduta, medicação ou prontuário.
  observacao_administrativa TEXT,

  -- Metadados
  created_at                TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at                TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.patients IS
  'Dados administrativos de pacientes. NÃO é prontuário eletrônico. '
  'Proibido registrar diagnóstico, CID, evolução clínica ou qualquer dado de prontuário.';

COMMENT ON COLUMN public.patients.observacao_administrativa IS
  'Campo exclusivamente administrativo. Não registrar diagnóstico, CID, '
  'evolução clínica, relato do paciente, conduta, medicação ou informações de prontuário.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_patients_company_id
  ON public.patients(company_id);

CREATE INDEX IF NOT EXISTS idx_patients_nome_completo
  ON public.patients(nome_completo);

CREATE INDEX IF NOT EXISTS idx_patients_cpf
  ON public.patients(cpf);

-- Índice único parcial: CPF único por empresa (ignora nulos e vazios)
-- Mesmo padrão já utilizado no projeto para evitar duplicações por empresa
CREATE UNIQUE INDEX IF NOT EXISTS patients_company_cpf_unique
  ON public.patients(company_id, cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';


-- ── 2. TABELA: patient_responsibles ─────────────────────────────
-- Responsáveis do paciente (legal e/ou financeiro).
-- Um paciente pode ter múltiplos responsáveis com papéis diferentes.
-- Responsável legal e financeiro podem ser pessoas diferentes.

CREATE TABLE IF NOT EXISTS public.patient_responsibles (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id                UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- FK inline simples omitida: a integridade multiempresa é garantida via
  -- FK composta (patient_id, company_id) → patients(id, company_id) adicionada abaixo.
  patient_id                UUID NOT NULL,

  -- Identificação
  nome_completo             TEXT NOT NULL,
  cpf                       TEXT,
  rg                        TEXT,
  data_nascimento           DATE,
  telefone                  TEXT,
  email                     TEXT,

  -- Relação com o paciente
  -- Valores: 'mae', 'pai', 'avo', 'tutor', 'curador', 'conjuge', 'outro'
  grau_parentesco           TEXT,

  -- Papéis — podem se sobrepor na mesma pessoa
  is_responsavel_legal      BOOLEAN NOT NULL DEFAULT FALSE,
  is_responsavel_financeiro BOOLEAN NOT NULL DEFAULT FALSE,

  -- Endereço (pode diferir do endereço do paciente)
  cep                       TEXT,
  logradouro                TEXT,
  numero                    TEXT,
  complemento               TEXT,
  bairro                    TEXT,
  cidade                    TEXT,
  uf                        CHAR(2),

  -- Metadados
  created_at                TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at                TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.patient_responsibles IS
  'Responsáveis legais e/ou financeiros de pacientes. '
  'Apenas dados administrativos. Sem campos clínicos.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_patient_resp_company_id
  ON public.patient_responsibles(company_id);

CREATE INDEX IF NOT EXISTS idx_patient_resp_patient_id
  ON public.patient_responsibles(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_resp_cpf
  ON public.patient_responsibles(cpf);


-- ── 3. TABELA: patient_term_templates ───────────────────────────
-- Templates de termos de paciente.
-- company_id NULL  = template do sistema (global, visível para todos)
-- company_id preenchido = template específico da empresa

CREATE TABLE IF NOT EXISTS public.patient_term_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  -- NULL = template do sistema

  nome          TEXT NOT NULL,
  -- Tipo canônico para Fase 1:
  --   'particular_adulto' | 'particular_menor'
  --   'avaliacao_neuro'   | 'online_adulto'
  -- Fase 2 adicionará: 'online_menor', 'convenio_adulto', 'convenio_menor'
  tipo          TEXT NOT NULL,
  descricao     TEXT,
  area_servico  TEXT, -- 'psicologia', 'neuropsicologia', 'fonoaudiologia', etc.

  is_sistema    BOOLEAN NOT NULL DEFAULT FALSE,
  template_data JSONB   NOT NULL DEFAULT '{}'::JSONB,

  -- Metadados
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.patient_term_templates IS
  'Templates de termos de serviço ao paciente. '
  'company_id NULL = template do sistema. Sem campos clínicos.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_ptt_tipo
  ON public.patient_term_templates(tipo);

CREATE INDEX IF NOT EXISTS idx_ptt_company_id
  ON public.patient_term_templates(company_id);

CREATE INDEX IF NOT EXISTS idx_ptt_is_sistema
  ON public.patient_term_templates(is_sistema);


-- ── 4. TABELA: patient_terms ─────────────────────────────────────
-- Entidade central do módulo: o termo de serviço gerado.
-- Preserva snapshot dos dados no momento da criação.
-- Sem campos clínicos.

CREATE TABLE IF NOT EXISTS public.patient_terms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- FK inline simples omitida: integridade multiempresa garantida via
  -- FK composta (patient_id, company_id) → patients(id, company_id) adicionada abaixo.
  patient_id    UUID NOT NULL,
  -- ON DELETE RESTRICT aplicado na FK composta abaixo.
  template_id   UUID REFERENCES public.patient_term_templates(id),
  -- NOTA: template_id não tem FK composta com company_id pois templates de sistema
  -- têm company_id NULL. Validação de ownership de template da empresa é feita pela API.

  -- Número único por empresa (gerado via RPC generate_patient_term_number)
  numero_termo  TEXT NOT NULL,

  -- Status canônico do ciclo de vida do termo
  status        TEXT NOT NULL DEFAULT 'rascunho'
                CHECK (status IN (
                  'rascunho',           -- criado, não finalizado
                  'ativo',              -- salvo e em uso
                  'pendente_assinatura',-- enviado para assinatura (Fase 4)
                  'assinado',           -- assinatura coletada (Fase 4)
                  'cancelado',          -- encerrado antes do previsto
                  'expirado',           -- passou da data de revisão sem renovação
                  'substituido'         -- substituído por novo termo (histórico preservado)
                )),

  -- Tipo do termo — define o template usado e as cláusulas geradas
  tipo_termo    TEXT NOT NULL
                CHECK (tipo_termo IN (
                  'particular_adulto',
                  'particular_menor',
                  'avaliacao_neuro',
                  'online_adulto'
                  -- Fase 2: 'online_menor', 'convenio_adulto', 'convenio_menor'
                )),

  -- Dados do serviço
  area_servico              TEXT,
  profissional_responsavel  TEXT,
  modalidade                TEXT
                            CHECK (modalidade IN ('presencial', 'online', 'hibrido')),

  -- Responsáveis — IDs de referência + snapshot de nome no momento da criação
  -- (snapshot garante integridade histórica mesmo se o responsável for editado)
  -- FKs compostas (responsavel_*_id, patient_id, company_id) adicionadas abaixo
  -- para garantir que o responsável pertença ao mesmo paciente e empresa.
  responsavel_legal_id      UUID,
  responsavel_legal_nome    TEXT,
  responsavel_financeiro_id UUID,
  responsavel_financeiro_nome TEXT,
  mesmo_responsavel         BOOLEAN NOT NULL DEFAULT TRUE,

  -- Serviço — detalhes administrativos
  local_atendimento         TEXT,
  plataforma_online         TEXT,        -- ex: 'Google Meet', 'Zoom'
  frequencia                TEXT,        -- ex: 'semanal', 'quinzenal'
  duracao_sessao            TEXT,        -- ex: '50 minutos'
  quantidade_sessoes        INTEGER,     -- se for pacote/avaliação fechada
  data_inicio_atendimento   DATE,
  vigencia_indeterminada    BOOLEAN NOT NULL DEFAULT TRUE,
  data_fim_atendimento      DATE,

  -- Financeiro
  -- Fase 1 usa apenas 'particular'. 'convenio' preparado para Fase 2.
  tipo_pagamento            TEXT NOT NULL DEFAULT 'particular'
                            CHECK (tipo_pagamento IN ('particular', 'convenio')),
  valor_sessao              NUMERIC(10,2),
  valor_pacote              NUMERIC(10,2),
  forma_pagamento           TEXT[],
  vencimento_pagamento      TEXT,        -- ex: 'todo dia 05', 'no dia da sessão'
  emite_nota_fiscal         TEXT
                            CHECK (emite_nota_fiscal IN (
                              'obrigatorio', 'quando_solicitado', 'nao_emite'
                            )),

  -- Regras de atendimento
  regra_falta               TEXT,
  regra_cancelamento        TEXT,
  antecedencia_cancelamento TEXT,        -- ex: '24 horas', '48 horas'
  regra_remarcacao          TEXT,
  regra_atraso              TEXT,
  regra_reajuste            TEXT,
  periodicidade_reajuste    TEXT,        -- ex: 'anual (mínimo 12 meses)'
  aviso_previo_reajuste     TEXT,        -- ex: '30 dias de antecedência'
  regra_encerramento        TEXT,

  -- Consentimentos — registram aceite no momento da geração do termo
  consentimento_sigilo            BOOLEAN DEFAULT FALSE,
  consentimento_lgpd              BOOLEAN DEFAULT FALSE,
  consentimento_contato_admin     BOOLEAN DEFAULT FALSE,
  consentimento_sem_promessa      BOOLEAN DEFAULT FALSE,
  consentimento_online            BOOLEAN DEFAULT FALSE, -- apenas se modalidade online
  consentimento_responsavel_menor BOOLEAN DEFAULT FALSE, -- apenas se is_menor

  -- HTML gerado — snapshot completo do termo
  termo_html          TEXT,
  -- HTML original preservado, mesmo se futuramente houver edições
  termo_html_original TEXT,

  -- Datas de controle
  -- data_revisao_recomendada: calculada em created_at + 12 meses pela API
  -- É usada pelo Compliance (Fase 2) para alertar sobre termos desatualizados
  data_revisao_recomendada  DATE,

  -- Assinatura (Fase 4)
  data_assinatura           TIMESTAMPTZ,
  signed_by                 TEXT,

  -- Metadados
  created_at                TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at                TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.patient_terms IS
  'Termos de serviço entre a clínica e seus pacientes/responsáveis. '
  'Dado administrativo e contratual. NÃO é prontuário clínico. '
  'Proibido registrar diagnóstico, CID, conduta clínica ou dados de prontuário.';

COMMENT ON COLUMN public.patient_terms.termo_html IS
  'HTML final do termo gerado. Dado contratual/administrativo. Não contém conteúdo clínico.';

COMMENT ON COLUMN public.patient_terms.consentimento_lgpd IS
  'Registra que o paciente/responsável consentiu com o tratamento de dados '
  'pessoais e sensíveis conforme a LGPD (Lei 13.709/2018). '
  'Base legal: execução de contrato (art. 7º, V) e proteção da saúde (art. 11, II, f).';

-- Número único por empresa — evita duplicação de TP-YYYY-XXXX
ALTER TABLE public.patient_terms
  DROP CONSTRAINT IF EXISTS patient_terms_company_numero_unique;
ALTER TABLE public.patient_terms
  ADD CONSTRAINT patient_terms_company_numero_unique
  UNIQUE (company_id, numero_termo);

-- Índices
CREATE INDEX IF NOT EXISTS idx_patient_terms_company_id
  ON public.patient_terms(company_id);

CREATE INDEX IF NOT EXISTS idx_patient_terms_patient_id
  ON public.patient_terms(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_terms_status
  ON public.patient_terms(status);

CREATE INDEX IF NOT EXISTS idx_patient_terms_tipo_termo
  ON public.patient_terms(tipo_termo);

CREATE INDEX IF NOT EXISTS idx_patient_terms_created_at
  ON public.patient_terms(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_terms_data_revisao
  ON public.patient_terms(data_revisao_recomendada)
  WHERE data_revisao_recomendada IS NOT NULL;


-- ── 5. TABELA: patient_term_audit_logs ──────────────────────────
-- Auditoria de ações sobre termos de paciente.
-- Sem dados clínicos — apenas registro de ações administrativas.

CREATE TABLE IF NOT EXISTS public.patient_term_audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- FK inline simples omitida: integridade multiempresa garantida via
  -- FK composta (term_id, company_id) → patient_terms(id, company_id) adicionada abaixo.
  term_id     UUID NOT NULL,

  -- Ação realizada
  -- Valores: 'criado' | 'editado' | 'impresso' | 'cancelado'
  --          | 'assinado' | 'substituido' | 'expirado'
  acao        TEXT NOT NULL,

  -- Usuário que realizou a ação (pode ser NULL para ações de sistema/cron)
  usuario_id  UUID REFERENCES auth.users(id),

  -- Detalhes opcionais da ação (ex: status anterior, motivo de cancelamento)
  detalhes    JSONB,

  -- Sem updated_at — log imutável por natureza
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.patient_term_audit_logs IS
  'Log imutável de ações sobre termos de pacientes. '
  'Apenas registro de ações administrativas. Sem dados clínicos.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_ptaudit_company_id
  ON public.patient_term_audit_logs(company_id);

CREATE INDEX IF NOT EXISTS idx_ptaudit_term_id
  ON public.patient_term_audit_logs(term_id);

CREATE INDEX IF NOT EXISTS idx_ptaudit_created_at
  ON public.patient_term_audit_logs(created_at DESC);


-- ── 6. INTEGRIDADE MULTIEMPRESA — CONSTRAINTS COMPOSTAS ─────────
-- A RLS protege leitura/escrita, mas não garante integridade referencial
-- cruzada entre empresas em nível de banco de dados.
-- As constraints compostas abaixo fecham essa lacuna:
-- garantem que pacientes, responsáveis, termos e logs
-- sempre pertençam à mesma empresa em toda a cadeia.
--
-- IDEMPOTÊNCIA REAL: a ordem de drops é crítica.
-- PostgreSQL recusa DROP de uma UNIQUE se existirem FKs dependentes.
-- Por isso a sequência obrigatória é:
--   1) Dropar FKs compostas (do mais dependente para o menos dependente)
--   2) Dropar UNIQUEs compostas (que eram referenciadas pelas FKs)
--   3) Recriar UNIQUEs compostas
--   4) Recriar FKs compostas (do menos dependente para o mais dependente)
-- Não usar CASCADE nos drops — preferir ordem explícita e segura.

-- ══════════════════════════════════════════════════════════════════
-- PASSO 1 — DROPAR FKs COMPOSTAS
-- Ordem: da mais dependente para a menos dependente.
-- audit_logs depende de patient_terms → dropar primeiro.
-- patient_terms depende de patient_responsibles e patients → dropar depois.
-- patient_responsibles depende de patients → dropar por último.
-- ══════════════════════════════════════════════════════════════════

-- FK mais profunda: audit_log → patient_terms
ALTER TABLE public.patient_term_audit_logs
  DROP CONSTRAINT IF EXISTS ptaudit_term_company_fk;

-- FKs de patient_terms → patient_responsibles
ALTER TABLE public.patient_terms
  DROP CONSTRAINT IF EXISTS patient_terms_resp_fin_same_patient_company_fk;
ALTER TABLE public.patient_terms
  DROP CONSTRAINT IF EXISTS patient_terms_resp_legal_same_patient_company_fk;

-- FK de patient_terms → patients
ALTER TABLE public.patient_terms
  DROP CONSTRAINT IF EXISTS patient_terms_patient_company_fk;

-- FK de patient_responsibles → patients
ALTER TABLE public.patient_responsibles
  DROP CONSTRAINT IF EXISTS patient_responsibles_patient_company_fk;

-- ══════════════════════════════════════════════════════════════════
-- PASSO 2 — DROPAR UNIQUEs COMPOSTAS
-- Agora sem risco de bloqueio: todas as FKs dependentes já foram dropadas.
-- Ordem: da mais dependente para a menos dependente.
-- ══════════════════════════════════════════════════════════════════

-- UNIQUE de patient_terms (referenciada por ptaudit_term_company_fk)
ALTER TABLE public.patient_terms
  DROP CONSTRAINT IF EXISTS patient_terms_id_company_unique;

-- UNIQUE de patient_responsibles (referenciada por FKs de responsáveis em patient_terms)
ALTER TABLE public.patient_responsibles
  DROP CONSTRAINT IF EXISTS patient_responsibles_id_patient_company_unique;

-- UNIQUE de patients (referenciada por FKs de patient_responsibles e patient_terms)
ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_id_company_unique;

-- ══════════════════════════════════════════════════════════════════
-- PASSO 3 — RECRIAR UNIQUEs COMPOSTAS
-- Ordem: da menos dependente para a mais dependente.
-- patients primeiro, pois patient_responsibles e patient_terms dependem dela.
-- ══════════════════════════════════════════════════════════════════

-- UNIQUE em patients — referenciada por FKs de patient_responsibles e patient_terms
ALTER TABLE public.patients
  ADD CONSTRAINT patients_id_company_unique
  UNIQUE (id, company_id);

-- UNIQUE em patient_responsibles — referenciada por FKs de responsáveis em patient_terms
ALTER TABLE public.patient_responsibles
  ADD CONSTRAINT patient_responsibles_id_patient_company_unique
  UNIQUE (id, patient_id, company_id);

-- UNIQUE em patient_terms — referenciada pela FK do audit_log
ALTER TABLE public.patient_terms
  ADD CONSTRAINT patient_terms_id_company_unique
  UNIQUE (id, company_id);

-- ══════════════════════════════════════════════════════════════════
-- PASSO 4 — RECRIAR FKs COMPOSTAS
-- Ordem: da menos dependente para a mais dependente.
-- patient_responsibles → patients primeiro.
-- patient_terms → patients e patient_responsibles depois.
-- audit_logs → patient_terms por último.
-- ══════════════════════════════════════════════════════════════════

-- FK: patient_responsibles → patients
-- Garante que o responsável só pode ser vinculado a paciente da mesma empresa.
ALTER TABLE public.patient_responsibles
  ADD CONSTRAINT patient_responsibles_patient_company_fk
  FOREIGN KEY (patient_id, company_id)
  REFERENCES public.patients(id, company_id)
  ON DELETE CASCADE;

-- FK: patient_terms → patients (ON DELETE RESTRICT — paciente com termos não pode ser excluído)
ALTER TABLE public.patient_terms
  ADD CONSTRAINT patient_terms_patient_company_fk
  FOREIGN KEY (patient_id, company_id)
  REFERENCES public.patients(id, company_id)
  ON DELETE RESTRICT;

-- FK: patient_terms → patient_responsibles (responsável legal)
-- Garante que o responsável legal pertence ao mesmo paciente e empresa do termo.
-- NULL em responsavel_legal_id: PostgreSQL não verifica FK composta quando
-- qualquer coluna participante é NULL — sem erro, sem obrigatoriedade.
ALTER TABLE public.patient_terms
  ADD CONSTRAINT patient_terms_resp_legal_same_patient_company_fk
  FOREIGN KEY (responsavel_legal_id, patient_id, company_id)
  REFERENCES public.patient_responsibles(id, patient_id, company_id);

-- FK: patient_terms → patient_responsibles (responsável financeiro)
-- Mesma garantia para o responsável financeiro.
-- NULL em responsavel_financeiro_id também tratado silenciosamente pelo PostgreSQL.
ALTER TABLE public.patient_terms
  ADD CONSTRAINT patient_terms_resp_fin_same_patient_company_fk
  FOREIGN KEY (responsavel_financeiro_id, patient_id, company_id)
  REFERENCES public.patient_responsibles(id, patient_id, company_id);

-- FK: patient_term_audit_logs → patient_terms
-- Garante que o log aponta para um termo da mesma empresa.
ALTER TABLE public.patient_term_audit_logs
  ADD CONSTRAINT ptaudit_term_company_fk
  FOREIGN KEY (term_id, company_id)
  REFERENCES public.patient_terms(id, company_id)
  ON DELETE CASCADE;

-- ─── template_id — sem FK composta (intencional) ─────────────────
-- patient_terms.template_id referencia patient_term_templates.id via FK simples
-- (definida no CREATE TABLE).
-- FK composta com company_id não é viável: templates de sistema têm company_id IS NULL.
-- Uma FK composta exigiria company_id não-nulo nos dois lados.
-- VALIDAÇÃO FUTURA: a API (Prompt D) deve verificar, ao criar/editar um termo,
-- que o template_id referenciado é do sistema (is_sistema = TRUE) ou pertence
-- à empresa do usuário. Trigger específica pode ser adicionada em migration futura.


-- ── 7. TRIGGERS updated_at ──────────────────────────────────────
-- Reutiliza handle_updated_at() já existente (criada na migration 001).
-- Não recriar a função — apenas aplicar nas novas tabelas.

DROP TRIGGER IF EXISTS patients_updated_at          ON public.patients;
CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS patient_resp_updated_at      ON public.patient_responsibles;
CREATE TRIGGER patient_resp_updated_at
  BEFORE UPDATE ON public.patient_responsibles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS patient_tpl_updated_at       ON public.patient_term_templates;
CREATE TRIGGER patient_tpl_updated_at
  BEFORE UPDATE ON public.patient_term_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS patient_terms_updated_at     ON public.patient_terms;
CREATE TRIGGER patient_terms_updated_at
  BEFORE UPDATE ON public.patient_terms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- patient_term_audit_logs não precisa de updated_at — log imutável.


-- ── 8. RLS — ROW LEVEL SECURITY ─────────────────────────────────
-- Padrão exato das migrations existentes:
--   company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
-- Não usar auth.uid() diretamente como company_id.

ALTER TABLE public.patients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_responsibles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_term_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_terms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_term_audit_logs  ENABLE ROW LEVEL SECURITY;

-- ─── PATIENTS ────────────────────────────────────────────────────
-- Leitura e escrita apenas para registros da própria empresa.

DROP POLICY IF EXISTS "patients_own" ON public.patients;
CREATE POLICY "patients_own" ON public.patients
  FOR ALL USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- ─── PATIENT_RESPONSIBLES ────────────────────────────────────────
-- Segue via company_id (mesmo padrão de service_providers).

DROP POLICY IF EXISTS "patient_resp_own" ON public.patient_responsibles;
CREATE POLICY "patient_resp_own" ON public.patient_responsibles
  FOR ALL USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- ─── PATIENT_TERM_TEMPLATES ──────────────────────────────────────
-- SELECT: templates do sistema (company_id IS NULL) + templates da empresa
-- INSERT/UPDATE/DELETE: apenas templates da própria empresa
-- (o sistema não pode criar/editar templates de sistema via API — is_sistema só via migration/SQL)

DROP POLICY IF EXISTS "patient_term_tpl_read"  ON public.patient_term_templates;
CREATE POLICY "patient_term_tpl_read" ON public.patient_term_templates
  FOR SELECT USING (
    is_sistema = TRUE
    OR company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "patient_term_tpl_write" ON public.patient_term_templates;
CREATE POLICY "patient_term_tpl_write" ON public.patient_term_templates
  FOR ALL USING (
    is_sistema = FALSE
    AND company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- ─── PATIENT_TERMS ───────────────────────────────────────────────

DROP POLICY IF EXISTS "patient_terms_own" ON public.patient_terms;
CREATE POLICY "patient_terms_own" ON public.patient_terms
  FOR ALL USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- ─── PATIENT_TERM_AUDIT_LOGS ─────────────────────────────────────
-- Leitura: apenas da própria empresa.
-- Inserção: via API autenticada (service role NÃO necessário aqui).
-- O log é imutável: não permitir UPDATE nem DELETE por RLS.

DROP POLICY IF EXISTS "ptaudit_read"   ON public.patient_term_audit_logs;
CREATE POLICY "ptaudit_read" ON public.patient_term_audit_logs
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ptaudit_insert" ON public.patient_term_audit_logs;
CREATE POLICY "ptaudit_insert" ON public.patient_term_audit_logs
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- UPDATE e DELETE intencionalmente não permitidos (log imutável).


-- ── 9. RPC: generate_patient_term_number ────────────────────────
-- Gera número sequencial de termo no formato TP-YYYY-XXXX.
-- Padrão idêntico ao generate_contract_number (migration 001),
-- adaptado para patient_terms com prefixo 'TP'.
-- Sequência por empresa + ano, começando em 0001.

CREATE OR REPLACE FUNCTION public.generate_patient_term_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year  INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW());

  -- Conta termos desta empresa neste ano (incluindo todos os status)
  -- e soma 1 para gerar o próximo número.
  -- Mesmo padrão de generate_contract_number para consistência.
  SELECT COUNT(*) + 1 INTO v_count
    FROM public.patient_terms
   WHERE company_id = p_company_id
     AND EXTRACT(YEAR FROM created_at) = v_year;

  RETURN 'TP-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_patient_term_number(UUID) IS
  'Gera número sequencial de termo de paciente no formato TP-YYYY-XXXX. '
  'Padrão análogo a generate_contract_number. Uso: SELECT generate_patient_term_number(company_id).';


-- ── 10. SEED — Templates do sistema (Fase 1) ─────────────────────
-- Idempotente: INSERT ... ON CONFLICT DO NOTHING com id fixo.
-- Segue padrão da migration 004 (templates de prestadores).
-- Apenas os 4 templates prioritários da Fase 1.
-- Convênio e Online+Menor ficam para Fase 2.
--
-- IMPORTANTE: template_data contém apenas dados administrativos.
-- Nenhum campo clínico.

INSERT INTO public.patient_term_templates
  (id, company_id, nome, tipo, descricao, area_servico, is_sistema, template_data)
VALUES
  -- 1. Particular — Adulto
  (
    'aaaaaaaa-0001-4000-a000-000000000001'::UUID,
    NULL,
    'Particular — Adulto',
    'particular_adulto',
    'Termo de prestação de serviços de saúde para paciente adulto, pagamento particular.',
    'psicologia',
    TRUE,
    '{
      "frequencia_padrao": "semanal",
      "duracao_sessao_padrao": "50 minutos",
      "antecedencia_cancelamento": "48 horas",
      "periodicidade_reajuste": "anual (mínimo 12 meses)",
      "aviso_previo_reajuste": "30 dias de antecedência",
      "aviso_previo_encerramento": "30 dias",
      "emite_nota_fiscal": "obrigatorio",
      "forma_pagamento_padrao": ["pix"],
      "vencimento_padrao": "no dia da sessão ou conforme combinado"
    }'::JSONB
  ),

  -- 2. Particular — Menor de Idade
  (
    'aaaaaaaa-0002-4000-a000-000000000002'::UUID,
    NULL,
    'Particular — Menor de Idade',
    'particular_menor',
    'Termo de prestação de serviços de saúde para paciente menor de idade. Requer responsável legal e financeiro.',
    'psicologia',
    TRUE,
    '{
      "frequencia_padrao": "semanal",
      "duracao_sessao_padrao": "50 minutos",
      "antecedencia_cancelamento": "48 horas",
      "periodicidade_reajuste": "anual (mínimo 12 meses)",
      "aviso_previo_reajuste": "30 dias de antecedência",
      "aviso_previo_encerramento": "30 dias",
      "emite_nota_fiscal": "obrigatorio",
      "forma_pagamento_padrao": ["pix"],
      "vencimento_padrao": "no dia da sessão ou conforme combinado",
      "requer_responsavel_legal": true,
      "requer_responsavel_financeiro": true
    }'::JSONB
  ),

  -- 3. Avaliação Neuropsicológica
  (
    'aaaaaaaa-0003-4000-a000-000000000003'::UUID,
    NULL,
    'Avaliação Neuropsicológica',
    'avaliacao_neuro',
    'Termo para pacote de avaliação neuropsicológica com número definido de sessões e entrega de relatório técnico.',
    'neuropsicologia',
    TRUE,
    '{
      "vigencia_indeterminada": false,
      "duracao_sessao_padrao": "60 minutos",
      "antecedencia_cancelamento": "48 horas",
      "emite_nota_fiscal": "obrigatorio",
      "forma_pagamento_padrao": ["pix", "transferencia"],
      "prazo_entrega_relatorio": "em até 20 dias úteis após a última sessão de avaliação",
      "politica_cancelamento_pacote": "Em caso de cancelamento após início da avaliação, será cobrado proporcionalmente às sessões já realizadas.",
      "nota_relatorio": "Será produzido relatório/documento técnico após conclusão do protocolo de avaliação. O conteúdo do documento técnico não é registrado neste sistema."
    }'::JSONB
  ),

  -- 4. Atendimento Online — Adulto
  (
    'aaaaaaaa-0004-4000-a000-000000000004'::UUID,
    NULL,
    'Atendimento Online — Adulto',
    'online_adulto',
    'Termo para atendimento psicológico online (por videoconferência) com adultos. Inclui cláusulas específicas da Resolução CFP nº 11/2018.',
    'psicologia',
    TRUE,
    '{
      "frequencia_padrao": "semanal",
      "duracao_sessao_padrao": "50 minutos",
      "antecedencia_cancelamento": "48 horas",
      "periodicidade_reajuste": "anual (mínimo 12 meses)",
      "aviso_previo_reajuste": "30 dias de antecedência",
      "aviso_previo_encerramento": "30 dias",
      "emite_nota_fiscal": "obrigatorio",
      "forma_pagamento_padrao": ["pix"],
      "vencimento_padrao": "no dia da sessão ou conforme combinado",
      "modalidade": "online",
      "clausulas_online": {
        "responsabilidade_conexao": "O paciente é responsável por garantir conexão de internet estável e ambiente reservado durante as sessões online.",
        "sigilo_ambiente": "O paciente compromete-se a realizar as sessões em local privado, sem a presença de terceiros não autorizados.",
        "gravacao_vedada": "É expressamente vedada a gravação das sessões por qualquer das partes, salvo autorização expressa e por escrito de ambos.",
        "crise_emergencia": "Em situações de crise ou emergência durante sessão online, o paciente deve informar imediatamente o profissional e, se necessário, acionar SAMU (192), CVV (188) ou serviço de saúde presencial.",
        "regulamentacao": "Este atendimento segue a Resolução CFP nº 11/2018 e normas complementares do Conselho Federal de Psicologia."
      }
    }'::JSONB
  )

ON CONFLICT (id) DO NOTHING;


-- ── CONCLUSÃO ────────────────────────────────────────────────────

DO $$ BEGIN
  RAISE NOTICE '===================================================';
  RAISE NOTICE 'Migration 007 aplicada com sucesso.';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabelas criadas:';
  RAISE NOTICE '  - patients';
  RAISE NOTICE '  - patient_responsibles';
  RAISE NOTICE '  - patient_term_templates';
  RAISE NOTICE '  - patient_terms';
  RAISE NOTICE '  - patient_term_audit_logs';
  RAISE NOTICE '';
  RAISE NOTICE 'RPC criada: generate_patient_term_number()';
  RAISE NOTICE '';
  RAISE NOTICE 'Seed: 4 templates do sistema inseridos (idempotente).';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE: Este módulo NÃO é prontuário eletrônico.';
  RAISE NOTICE 'Nenhum campo clínico foi criado.';
  RAISE NOTICE '===================================================';
END $$;
