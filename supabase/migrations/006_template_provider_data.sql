-- ================================================================
-- ContractCore — Migration 006 — provider_data em contract_templates
-- IDEMPOTENTE: pode ser executada múltiplas vezes sem erros
-- Execute no SQL Editor do Supabase
-- ================================================================

-- Adiciona a coluna provider_data, usada para guardar os dados
-- profissionais sugeridos (profissão, descrição, especialidade,
-- conselho profissional) de um template de contrato. O código já
-- depende desta coluna em:
--   src/types/index.ts
--   src/components/contract/NewContractPageClient.tsx
--   src/components/contract/SaveAsTemplateButton.tsx
-- mas a coluna nunca havia sido versionada em migration.

ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS provider_data JSONB NOT NULL DEFAULT '{}'::jsonb;
