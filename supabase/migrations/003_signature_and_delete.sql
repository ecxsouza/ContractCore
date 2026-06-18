-- ================================================================
-- ContractCore — Migration 003
-- Adiciona campos de assinatura com data e política de exclusão
-- Execute no SQL Editor do Supabase
-- ================================================================

-- Campos de data de assinatura (podem já existir, IF NOT EXISTS garante)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS data_assinatura_contratante TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_assinatura_prestador   TIMESTAMPTZ;

-- Política de exclusão: usuário pode excluir apenas seus próprios contratos
-- (RLS já está ativo, mas adicionamos explicitamente o DELETE)
DROP POLICY IF EXISTS "contracts_delete" ON public.contracts;
CREATE POLICY "contracts_delete" ON public.contracts
  FOR DELETE USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- Confirmar
DO $$ BEGIN
  RAISE NOTICE 'Migration 003 aplicada com sucesso.';
END $$;
