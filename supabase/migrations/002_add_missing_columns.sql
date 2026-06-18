-- ================================================================
-- ContractCore — Migration 002
-- Adiciona colunas ausentes nas tabelas existentes
-- Execute no SQL Editor do Supabase após a migration 001
-- ================================================================

-- ── service_providers: separar telefone em fixo + celular ────────
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS celular           TEXT,
  ADD COLUMN IF NOT EXISTS telefone_fixo     TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;

-- ── companies: adicionar inscrição estadual ──────────────────────
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;

-- ── Confirmação ───────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 002 aplicada com sucesso.';
  RAISE NOTICE 'Colunas adicionadas: service_providers.celular, telefone_fixo, inscricao_estadual';
  RAISE NOTICE 'Colunas adicionadas: companies.inscricao_estadual';
END $$;
