-- ================================================================
-- ContractCore — Migration 005 — Hardening
-- IDEMPOTENTE: pode ser executada múltiplas vezes sem erros
-- Execute no SQL Editor do Supabase
-- ================================================================

-- ── 1. STATUS AMPLIADO NOS CONTRATOS ─────────────────────────────
ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN (
    'rascunho',
    'em_revisao',
    'revisado_ia',
    'aguardando_aprovacao',
    'aguardando_assinatura',
    'assinado',
    'cancelado',
    'arquivado',
    'encerrado'
  ));

-- ── 2. CAMPOS EXTRAS NOS CONTRATOS ───────────────────────────────
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS nivel_risco           TEXT CHECK (nivel_risco IN ('baixo', 'medio', 'alto')),
  ADD COLUMN IF NOT EXISTS score_pejotizacao     INTEGER CHECK (score_pejotizacao BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS checklist_mesa        JSONB,
  ADD COLUMN IF NOT EXISTS clausulas_ajustadas   TEXT[],
  ADD COLUMN IF NOT EXISTS contrato_html_original TEXT,
  ADD COLUMN IF NOT EXISTS contrato_revisado_ia   TEXT,
  ADD COLUMN IF NOT EXISTS aprovado_em           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aprovado_por          UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS arquivado_em          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_renovacao          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contrato_original_id  UUID REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS data_assinatura_contratante TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_assinatura_prestador   TIMESTAMPTZ;

-- ── 3. CAMPOS EXTRAS NOS AI_LOGS ─────────────────────────────────
ALTER TABLE public.ai_logs
  ADD COLUMN IF NOT EXISTS custo_estimado_usd       NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS nivel_risco_retornado    TEXT,
  ADD COLUMN IF NOT EXISTS versao_modelo            TEXT;

-- ── 4. TABELA DE DOCUMENTOS DO PRESTADOR ─────────────────────────
CREATE TABLE IF NOT EXISTS public.provider_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id)         ON DELETE CASCADE,
  provider_id   UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN (
                  'identidade', 'cpf', 'cnpj', 'registro_conselho',
                  'comprovante_endereco', 'contrato_assinado',
                  'nota_fiscal', 'outro'
                )),
  storage_path  TEXT NOT NULL,
  tamanho_bytes INTEGER,
  mime_type     TEXT,
  observacao    TEXT,
  validade      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_docs_provider ON public.provider_documents(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_docs_company  ON public.provider_documents(company_id);

-- RLS
ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_docs_own" ON public.provider_documents;
CREATE POLICY "provider_docs_own" ON public.provider_documents
  FOR ALL USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- ── 5. BUCKET E POLICY DE STORAGE ────────────────────────────────
-- Bucket: provider-documents (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-documents',
  'provider-documents',
  FALSE,
  20971520,  -- 20 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Bucket: contract-pdfs (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-pdfs',
  'contract-pdfs',
  FALSE,
  52428800,  -- 50 MB
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Policies de storage — path padrão: {user_id}/{company_id}/...
-- DROP antes de CREATE para idempotência (Postgres não suporta CREATE POLICY IF NOT EXISTS)
DROP POLICY IF EXISTS "contract_pdfs_owner" ON storage.objects;
CREATE POLICY "contract_pdfs_owner" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'contract-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'contract-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "provider_docs_storage_owner" ON storage.objects;
CREATE POLICY "provider_docs_storage_owner" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'provider-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'provider-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ── 6. FUNÇÃO: CALCULAR CUSTO DA IA ──────────────────────────────
CREATE OR REPLACE FUNCTION public.calcular_custo_ia(
  p_prompt_tokens     INTEGER,
  p_completion_tokens INTEGER,
  p_modelo            TEXT DEFAULT 'claude-sonnet-4-6'
) RETURNS NUMERIC AS $$
DECLARE
  v_custo_input  NUMERIC;
  v_custo_output NUMERIC;
BEGIN
  CASE p_modelo
    WHEN 'claude-opus-4-6'          THEN v_custo_input := 0.000015;   v_custo_output := 0.000075;
    WHEN 'claude-haiku-4-5-20251001' THEN v_custo_input := 0.00000025; v_custo_output := 0.00000125;
    ELSE -- claude-sonnet-4-6 e desconhecidos
      v_custo_input  := 0.000003;
      v_custo_output := 0.000015;
  END CASE;
  RETURN ROUND(
    (p_prompt_tokens * v_custo_input) + (p_completion_tokens * v_custo_output),
    6
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── 7. VIEW DE DASHBOARD DE COMPLIANCE ───────────────────────────
CREATE OR REPLACE VIEW public.vw_compliance_dashboard AS
SELECT
  c.company_id,
  COUNT(*)                                                          AS total_contratos,
  COUNT(*) FILTER (WHERE c.status = 'assinado')                    AS assinados,
  COUNT(*) FILTER (WHERE c.status = 'rascunho')                    AS rascunhos,
  COUNT(*) FILTER (WHERE c.status = 'aguardando_assinatura')       AS aguardando_assinatura,
  COUNT(*) FILTER (WHERE c.status = 'aguardando_aprovacao')        AS aguardando_aprovacao,
  COUNT(*) FILTER (WHERE c.nivel_risco = 'alto')                   AS risco_alto,
  COUNT(*) FILTER (WHERE c.nivel_risco = 'medio')                  AS risco_medio,
  COUNT(*) FILTER (WHERE c.nivel_risco = 'baixo')                  AS risco_baixo,
  COUNT(*) FILTER (
    WHERE c.vigencia_indeterminada = FALSE
      AND c.data_vigencia_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
      AND c.status NOT IN ('cancelado','encerrado','arquivado')
  )                                                                 AS vencendo_30_dias,
  COUNT(*) FILTER (
    WHERE c.vigencia_indeterminada = FALSE
      AND c.data_vigencia_fim < CURRENT_DATE
      AND c.status NOT IN ('cancelado','encerrado','arquivado')
  )                                                                 AS vencidos
FROM public.contracts c
GROUP BY c.company_id;

-- ── 8. FUNÇÃO: GERAR ALERTAS DE COMPLIANCE ───────────────────────
CREATE OR REPLACE FUNCTION public.generate_compliance_alerts(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count    INTEGER := 0;
  v_contract RECORD;
BEGIN
  DELETE FROM public.compliance_alerts
   WHERE company_id = p_company_id AND resolvido = FALSE;

  -- Contratos vencendo nos próximos 30 dias
  FOR v_contract IN
    SELECT c.id, c.numero_contrato, c.data_vigencia_fim, sp.nome_razao_social
      FROM public.contracts c
      JOIN public.service_providers sp ON sp.id = c.provider_id
     WHERE c.company_id = p_company_id
       AND c.status NOT IN ('cancelado','encerrado','arquivado')
       AND c.vigencia_indeterminada = FALSE
       AND c.data_vigencia_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
  LOOP
    INSERT INTO public.compliance_alerts
      (company_id, contract_id, tipo, titulo, descricao, gravidade, data_referencia)
    VALUES (
      p_company_id, v_contract.id, 'contrato_vencendo',
      'Contrato vencendo em breve',
      'Contrato ' || v_contract.numero_contrato || ' com ' || v_contract.nome_razao_social ||
        ' vence em ' || TO_CHAR(v_contract.data_vigencia_fim, 'DD/MM/YYYY') || '.',
      CASE
        WHEN v_contract.data_vigencia_fim <= CURRENT_DATE + 7  THEN 'critico'
        WHEN v_contract.data_vigencia_fim <= CURRENT_DATE + 15 THEN 'importante'
        ELSE 'atencao'
      END,
      v_contract.data_vigencia_fim::TIMESTAMPTZ
    );
    v_count := v_count + 1;
  END LOOP;

  -- Contratos vencidos não encerrados
  FOR v_contract IN
    SELECT c.id, c.numero_contrato, c.data_vigencia_fim, sp.nome_razao_social
      FROM public.contracts c
      JOIN public.service_providers sp ON sp.id = c.provider_id
     WHERE c.company_id = p_company_id
       AND c.status NOT IN ('cancelado','encerrado','arquivado')
       AND c.vigencia_indeterminada = FALSE
       AND c.data_vigencia_fim < CURRENT_DATE
  LOOP
    INSERT INTO public.compliance_alerts
      (company_id, contract_id, tipo, titulo, descricao, gravidade, data_referencia)
    VALUES (
      p_company_id, v_contract.id, 'contrato_vencido',
      'Contrato vencido',
      'Contrato ' || v_contract.numero_contrato || ' com ' || v_contract.nome_razao_social ||
        ' venceu em ' || TO_CHAR(v_contract.data_vigencia_fim, 'DD/MM/YYYY') || ' e não foi encerrado.',
      'critico',
      v_contract.data_vigencia_fim::TIMESTAMPTZ
    );
    v_count := v_count + 1;
  END LOOP;

  -- Assinaturas pendentes há mais de 7 dias
  FOR v_contract IN
    SELECT c.id, c.numero_contrato, c.created_at, sp.nome_razao_social
      FROM public.contracts c
      JOIN public.service_providers sp ON sp.id = c.provider_id
     WHERE c.company_id = p_company_id
       AND c.status = 'aguardando_assinatura'
       AND c.created_at < NOW() - INTERVAL '7 days'
  LOOP
    INSERT INTO public.compliance_alerts
      (company_id, contract_id, tipo, titulo, descricao, gravidade, data_referencia)
    VALUES (
      p_company_id, v_contract.id, 'assinatura_pendente',
      'Assinatura pendente há mais de 7 dias',
      'Contrato ' || v_contract.numero_contrato || ' com ' || v_contract.nome_razao_social ||
        ' aguarda assinatura desde ' || TO_CHAR(v_contract.created_at, 'DD/MM/YYYY') || '.',
      'importante',
      v_contract.created_at
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  RAISE NOTICE 'Migration 005 aplicada com sucesso (idempotente).';
END $$;
