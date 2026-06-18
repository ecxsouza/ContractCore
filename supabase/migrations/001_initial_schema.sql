-- ================================================================
-- ContractCore — Schema SQL Completo
-- Execute no SQL Editor do Supabase Dashboard
-- Versão: 1.0.0
-- ================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── TABELA: companies (empresas contratantes) ────────────────────
CREATE TABLE public.companies (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Identificação
  razao_social          TEXT NOT NULL,
  nome_fantasia         TEXT NOT NULL,
  cnpj                  TEXT NOT NULL UNIQUE,
  inscricao_municipal   TEXT,
  data_abertura         DATE,
  porte                 TEXT,
  natureza_juridica     TEXT,
  atividade_principal   TEXT,
  -- Endereço
  cep                   TEXT NOT NULL,
  logradouro            TEXT NOT NULL,
  numero                TEXT NOT NULL,
  complemento           TEXT,
  bairro                TEXT NOT NULL,
  cidade                TEXT NOT NULL,
  uf                    CHAR(2) NOT NULL,
  -- Contato
  email                 TEXT NOT NULL,
  telefone              TEXT NOT NULL,
  -- Responsável
  responsavel_legal     TEXT NOT NULL,
  cpf_responsavel       TEXT NOT NULL,
  -- Logo
  logo_url              TEXT,
  -- Bancário
  banco                 TEXT,
  agencia               TEXT,
  conta                 TEXT,
  tipo_conta            TEXT CHECK (tipo_conta IN ('corrente', 'poupanca')),
  pix_key               TEXT,
  -- Metadados
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── TABELA: service_providers (prestadores de serviço) ───────────
CREATE TABLE public.service_providers (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id                  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Tipo jurídico
  tipo_pessoa                 TEXT NOT NULL CHECK (tipo_pessoa IN ('PJ', 'MEI', 'PF')),
  -- Dados
  nome_razao_social           TEXT NOT NULL,
  nome_fantasia               TEXT,
  cpf                         TEXT,
  cnpj                        TEXT,
  rg                          TEXT,
  inscricao_municipal         TEXT,
  -- Profissional
  profissao                   TEXT NOT NULL,
  profissao_descricao         TEXT,
  especialidade               TEXT,
  conselho_profissional       TEXT,
  numero_registro_conselho    TEXT,
  -- Endereço
  cep                         TEXT NOT NULL,
  logradouro                  TEXT NOT NULL,
  numero                      TEXT NOT NULL,
  complemento                 TEXT,
  bairro                      TEXT NOT NULL,
  cidade                      TEXT NOT NULL,
  uf                          CHAR(2) NOT NULL,
  -- Contato
  email                       TEXT NOT NULL,
  telefone                    TEXT NOT NULL,
  -- Responsável legal (PJ)
  responsavel_legal           TEXT,
  cpf_responsavel             TEXT,
  -- Dados pessoais (PF)
  estado_civil                TEXT,
  nacionalidade               TEXT DEFAULT 'Brasileira',
  -- Metadados
  created_at                  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at                  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── TABELA: contracts (contratos) ────────────────────────────────
CREATE TABLE public.contracts (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id                    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_id                   UUID NOT NULL REFERENCES public.service_providers(id),
  -- Identificação
  numero_contrato               TEXT NOT NULL UNIQUE, -- ex: CC-2024-0001
  versao                        INTEGER NOT NULL DEFAULT 1,
  status                        TEXT NOT NULL DEFAULT 'rascunho'
                                CHECK (status IN (
                                  'rascunho','em_revisao','revisado_ia',
                                  'aguardando_aprovacao','aguardando_assinatura',
                                  'assinado','cancelado','arquivado','encerrado'
                                )),
  -- Datas
  data_emissao                  DATE DEFAULT CURRENT_DATE NOT NULL,
  data_vigencia_inicio          DATE,
  data_vigencia_fim             DATE,
  vigencia_indeterminada        BOOLEAN DEFAULT TRUE,
  -- Dados da prestação (JSONB para flexibilidade)
  service_details               JSONB NOT NULL DEFAULT '{}'::JSONB,
  remuneration                  JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Anexos
  anexos                        TEXT[] DEFAULT '{}',
  -- Texto do contrato
  contrato_html                 TEXT,
  contrato_revisado_ia          TEXT,
  -- PDF
  pdf_url                       TEXT,
  -- IA
  ia_revisado                   BOOLEAN DEFAULT FALSE,
  ia_revisado_em                TIMESTAMPTZ,
  ia_sugestoes                  TEXT,
  ia_tokens_usados              INTEGER DEFAULT 0,
  -- Assinatura
  assinado_contratante          BOOLEAN DEFAULT FALSE,
  assinado_prestador            BOOLEAN DEFAULT FALSE,
  data_assinatura_contratante   TIMESTAMPTZ,
  data_assinatura_prestador     TIMESTAMPTZ,
  ip_assinatura_contratante     INET,
  ip_assinatura_prestador       INET,
  hash_documento                TEXT, -- SHA256 do contrato final
  -- Notas
  notas_internas                TEXT,
  -- Metadados
  created_at                    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at                    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── TABELA: contract_versions (histórico de versões) ─────────────
CREATE TABLE public.contract_versions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id      UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  versao           INTEGER NOT NULL,
  contrato_html    TEXT NOT NULL,
  alteracoes_resumo TEXT,
  alterado_por     UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── TABELA: ai_logs (auditoria de chamadas à IA) ─────────────────
CREATE TABLE public.ai_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES public.companies(id),
  contract_id      UUID REFERENCES public.contracts(id),
  tipo             TEXT NOT NULL CHECK (tipo IN (
                     'revisao','sugestao_objeto','sugestao_clausula','analise_risco'
                   )),
  prompt_tokens    INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens     INTEGER DEFAULT 0,
  modelo           TEXT NOT NULL,
  sucesso          BOOLEAN DEFAULT TRUE,
  erro_mensagem    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── TABELA: audit_logs (log de auditoria geral) ───────────────────
CREATE TABLE public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID REFERENCES public.companies(id),
  user_id      UUID REFERENCES auth.users(id),
  acao         TEXT NOT NULL,  -- ex: 'contract.created', 'contract.signed'
  tabela       TEXT,
  registro_id  UUID,
  dados_antes  JSONB,
  dados_depois JSONB,
  ip           INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── FUNÇÕES E TRIGGERS ────────────────────────────────────────────

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Gerar número de contrato automaticamente
CREATE OR REPLACE FUNCTION public.generate_contract_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year  INTEGER;
BEGIN
  v_year  := EXTRACT(YEAR FROM NOW());
  SELECT COUNT(*) + 1 INTO v_count
    FROM public.contracts
   WHERE company_id = p_company_id
     AND EXTRACT(YEAR FROM created_at) = v_year;
  RETURN 'CC-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Versionamento automático de contratos
CREATE OR REPLACE FUNCTION public.save_contract_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Salva versão sempre que contrato_html mudar
  IF (OLD.contrato_html IS DISTINCT FROM NEW.contrato_html
      AND NEW.contrato_html IS NOT NULL) THEN
    INSERT INTO public.contract_versions
      (contract_id, versao, contrato_html, alteracoes_resumo)
    VALUES
      (NEW.id, NEW.versao, NEW.contrato_html, 'Atualização automática');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_version_trigger
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.save_contract_version();

-- ── ÍNDICES PARA PERFORMANCE ──────────────────────────────────────
CREATE INDEX idx_companies_user_id        ON public.companies(user_id);
CREATE INDEX idx_providers_company_id     ON public.service_providers(company_id);
CREATE INDEX idx_contracts_company_id     ON public.contracts(company_id);
CREATE INDEX idx_contracts_provider_id    ON public.contracts(provider_id);
CREATE INDEX idx_contracts_status         ON public.contracts(status);
CREATE INDEX idx_contracts_numero         ON public.contracts(numero_contrato);
CREATE INDEX idx_contract_versions_cid    ON public.contract_versions(contract_id);
CREATE INDEX idx_ai_logs_company_id       ON public.ai_logs(company_id);
CREATE INDEX idx_audit_logs_company_id    ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id       ON public.audit_logs(user_id);

-- ── ROW LEVEL SECURITY (RLS) ──────────────────────────────────────

ALTER TABLE public.companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;

-- COMPANIES: usuário acessa apenas sua empresa
CREATE POLICY "companies_own" ON public.companies
  FOR ALL USING (auth.uid() = user_id);

-- SERVICE_PROVIDERS: via company
CREATE POLICY "providers_via_company" ON public.service_providers
  FOR ALL USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- CONTRACTS: via company
CREATE POLICY "contracts_via_company" ON public.contracts
  FOR ALL USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- CONTRACT_VERSIONS: via contract
CREATE POLICY "versions_via_contract" ON public.contract_versions
  FOR ALL USING (
    contract_id IN (
      SELECT id FROM public.contracts
       WHERE company_id IN (
         SELECT id FROM public.companies WHERE user_id = auth.uid()
       )
    )
  );

-- AI_LOGS: via company
CREATE POLICY "ai_logs_via_company" ON public.ai_logs
  FOR ALL USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- AUDIT_LOGS: leitura via company, inserção via service role
CREATE POLICY "audit_logs_read" ON public.audit_logs
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- ── STORAGE BUCKETS ───────────────────────────────────────────────
-- Execute estas queries no Dashboard > Storage > New Bucket
-- OU via API do Supabase

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('company-logos', 'company-logos', TRUE,  5242880,  -- 5MB
   ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('contract-pdfs', 'contract-pdfs', FALSE, 52428800, -- 50MB
   ARRAY['application/pdf']);

-- Políticas de Storage
CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "logos_authenticated_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "logos_own_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-logos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "pdfs_own_access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'contract-pdfs'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ── DADOS DE EXEMPLO (opcional) ───────────────────────────────────
-- Remova este bloco em produção

-- A empresa Bem Estar é inserida automaticamente no primeiro login
-- através do fluxo de onboarding do sistema
