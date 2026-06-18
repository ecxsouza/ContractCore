-- ================================================================
-- ContractCore — Migration 004 — Bloco 1 Features
-- Execute no SQL Editor do Supabase após migrations anteriores
-- ================================================================

-- ── TEMPLATES DE CONTRATO POR PROFISSÃO ─────────────────────────
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  -- NULL = template do sistema (global); preenchido = template da empresa
  profissao     TEXT NOT NULL,
  nome          TEXT NOT NULL,
  descricao     TEXT,
  is_sistema    BOOLEAN DEFAULT FALSE, -- templates padrão do sistema
  service_data  JSONB NOT NULL DEFAULT '{}'::JSONB,
  remuneration_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  anexos_padrao TEXT[] DEFAULT '{}',
  uso_count     INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_templates_profissao  ON public.contract_templates(profissao);
CREATE INDEX idx_templates_company_id ON public.contract_templates(company_id);

-- ── ALERTAS DE COMPLIANCE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id   UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  provider_id   UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN (
                  'contrato_vencendo',    -- contrato próximo do término
                  'assinatura_pendente',  -- aguardando assinatura há X dias
                  'contrato_vencido',     -- contrato expirado
                  'registro_conselho'     -- registro profissional a verificar
                )),
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  gravidade     TEXT NOT NULL DEFAULT 'atencao'
                CHECK (gravidade IN ('atencao', 'importante', 'critico')),
  resolvido     BOOLEAN DEFAULT FALSE,
  resolvido_em  TIMESTAMPTZ,
  data_referencia TIMESTAMPTZ, -- data do evento (vencimento, etc)
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_alerts_company_id ON public.compliance_alerts(company_id);
CREATE INDEX idx_alerts_resolvido   ON public.compliance_alerts(resolvido);

-- ── CAMPOS EXTRAS EM CONTRACTS ───────────────────────────────────
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contrato_original_id UUID REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS is_renovacao BOOLEAN DEFAULT FALSE;
-- contrato_original_id: aponta para o contrato que gerou esta renovação

-- ── RLS PARA NOVAS TABELAS ───────────────────────────────────────
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_alerts  ENABLE ROW LEVEL SECURITY;

-- Templates: ver os do sistema + os da própria empresa
CREATE POLICY "templates_read" ON public.contract_templates
  FOR SELECT USING (
    is_sistema = TRUE
    OR company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "templates_write" ON public.contract_templates
  FOR ALL USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- Alertas: apenas da própria empresa
CREATE POLICY "alerts_own" ON public.compliance_alerts
  FOR ALL USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- ── TRIGGER updated_at ───────────────────────────────────────────
CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── TEMPLATES PADRÃO DO SISTEMA ──────────────────────────────────
INSERT INTO public.contract_templates
  (id, company_id, profissao, nome, descricao, is_sistema, service_data, remuneration_data, anexos_padrao)
VALUES
  (
    uuid_generate_v4(), NULL, 'psicologo',
    'Psicólogo(a) Clínico — Padrão',
    'Template padrão para psicólogos com atendimento presencial por sessão',
    TRUE,
    '{
      "objeto": "A CONTRATADA prestará serviços de psicologia clínica, compreendendo atendimentos psicoterápicos individuais, avaliações psicológicas e orientação a pais e responsáveis, com plena autonomia técnica e científica, em conformidade com o Código de Ética Profissional do Psicólogo e as Resoluções do CFP.",
      "modalidade": "presencial",
      "periodicidade": "conforme agenda pactuada",
      "exclusividade": false,
      "recursos_disponibilizados": ["Sala de atendimento", "Prontuário digital", "Sistema de agenda"],
      "regra_cancelamento": "O cancelamento deve ser comunicado com mínimo de 24 horas de antecedência por WhatsApp ou e-mail institucional.",
      "regra_captacao_pacientes": "É vedada a captação de pacientes da CONTRATANTE para atendimento externo durante a vigência e por 12 meses após o encerramento."
    }'::JSONB,
    '{
      "modelos": ["por_atendimento"],
      "formas_pagamento": ["pix"],
      "emite_nota_fiscal": "obrigatorio",
      "data_pagamento": "todo dia 05 do mês seguinte à prestação dos serviços"
    }'::JSONB,
    ARRAY['confidencialidade', 'lgpd', 'prontuarios', 'sem_vinculo_clt', 'checklist_pejotizacao']
  ),
  (
    uuid_generate_v4(), NULL, 'neuropsicologo',
    'Neuropsicólogo(a) — Avaliação',
    'Template para neuropsicólogos com foco em avaliações e laudos',
    TRUE,
    '{
      "objeto": "A CONTRATADA prestará serviços de neuropsicologia, compreendendo avaliações neuropsicológicas, elaboração de laudos e relatórios técnicos, devolutivas e acompanhamento, com plena autonomia técnica e em conformidade com as normas do CFP.",
      "modalidade": "presencial",
      "periodicidade": "conforme agenda pactuada",
      "exclusividade": false,
      "recursos_disponibilizados": ["Sala de atendimento", "Testes psicológicos", "Prontuário digital"],
      "regra_cancelamento": "Cancelamentos de avaliação devem ser comunicados com mínimo de 48 horas de antecedência.",
      "regra_documentos": "Laudos e relatórios são de responsabilidade técnica exclusiva da CONTRATADA, devendo ser arquivados conforme normas do CFP."
    }'::JSONB,
    '{
      "modelos": ["por_atendimento", "pacote"],
      "formas_pagamento": ["pix", "transferencia"],
      "emite_nota_fiscal": "obrigatorio",
      "data_pagamento": "todo dia 05 do mês seguinte à prestação dos serviços"
    }'::JSONB,
    ARRAY['confidencialidade', 'lgpd', 'prontuarios', 'sem_vinculo_clt', 'checklist_conselho']
  ),
  (
    uuid_generate_v4(), NULL, 'fonoaudiologo',
    'Fonoaudiólogo(a) — Padrão',
    'Template para fonoaudiólogos com atendimento clínico',
    TRUE,
    '{
      "objeto": "A CONTRATADA prestará serviços de fonoaudiologia clínica, compreendendo avaliação, diagnóstico e terapia fonoaudiológica, com plena autonomia técnica e em conformidade com as normas do CFFa.",
      "modalidade": "presencial",
      "periodicidade": "conforme agenda pactuada",
      "exclusividade": false,
      "recursos_disponibilizados": ["Sala de atendimento", "Sistema de agenda"],
      "regra_cancelamento": "Cancelamentos com menos de 24 horas de antecedência poderão ser cobrados."
    }'::JSONB,
    '{
      "modelos": ["por_atendimento"],
      "formas_pagamento": ["pix"],
      "emite_nota_fiscal": "obrigatorio",
      "data_pagamento": "todo dia 05 do mês seguinte à prestação dos serviços"
    }'::JSONB,
    ARRAY['confidencialidade', 'lgpd', 'sem_vinculo_clt', 'checklist_conselho']
  ),
  (
    uuid_generate_v4(), NULL, 'psicopedagogo',
    'Psicopedagogo(a) — Padrão',
    'Template para psicopedagogos com atendimento clínico e institucional',
    TRUE,
    '{
      "objeto": "A CONTRATADA prestará serviços de psicopedagogia clínica, compreendendo avaliação psicopedagógica, intervenção terapêutica, orientação a pais e articulação com escola quando necessário, com plena autonomia técnica.",
      "modalidade": "presencial",
      "periodicidade": "conforme agenda pactuada",
      "exclusividade": false,
      "recursos_disponibilizados": ["Sala de atendimento", "Sistema de agenda", "Materiais clínicos"]
    }'::JSONB,
    '{
      "modelos": ["por_atendimento"],
      "formas_pagamento": ["pix"],
      "emite_nota_fiscal": "obrigatorio",
      "data_pagamento": "todo dia 05 do mês seguinte à prestação dos serviços"
    }'::JSONB,
    ARRAY['confidencialidade', 'lgpd', 'sem_vinculo_clt']
  ),
  (
    uuid_generate_v4(), NULL, 'secretaria',
    'Secretária / Recepcionista — PJ',
    'Template para secretárias e recepcionistas contratadas como PJ',
    TRUE,
    '{
      "objeto": "A CONTRATADA prestará serviços de secretariado clínico, compreendendo atendimento a pacientes, agendamento de consultas, gestão de agenda, controle de prontuários e suporte administrativo geral à CONTRATANTE.",
      "modalidade": "presencial",
      "periodicidade": "conforme agenda pactuada",
      "exclusividade": false,
      "recursos_disponibilizados": ["Recepção", "Sistema de agenda", "Prontuário digital", "Internet", "Telefone"]
    }'::JSONB,
    '{
      "modelos": ["fixo_mensal"],
      "formas_pagamento": ["pix"],
      "emite_nota_fiscal": "obrigatorio",
      "data_pagamento": "todo dia 05 do mês seguinte à prestação dos serviços"
    }'::JSONB,
    ARRAY['confidencialidade', 'lgpd', 'sem_vinculo_clt', 'checklist_pejotizacao']
  );

-- ── FUNÇÃO PARA GERAR ALERTAS DE COMPLIANCE ──────────────────────
-- Chame esta função periodicamente (cron) ou manualmente
CREATE OR REPLACE FUNCTION public.generate_compliance_alerts(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_contract RECORD;
BEGIN
  -- Limpar alertas não resolvidos antigos para recriar
  DELETE FROM public.compliance_alerts
   WHERE company_id = p_company_id AND resolvido = FALSE;

  -- Contratos vencendo em até 30 dias
  FOR v_contract IN
    SELECT c.id, c.numero_contrato, c.data_vigencia_fim,
           sp.nome_razao_social
      FROM public.contracts c
      JOIN public.service_providers sp ON sp.id = c.provider_id
     WHERE c.company_id = p_company_id
       AND c.status NOT IN ('cancelado', 'encerrado')
       AND c.vigencia_indeterminada = FALSE
       AND c.data_vigencia_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
  LOOP
    INSERT INTO public.compliance_alerts
      (company_id, contract_id, tipo, titulo, descricao, gravidade, data_referencia)
    VALUES (
      p_company_id, v_contract.id,
      'contrato_vencendo',
      'Contrato vencendo em breve',
      'Contrato ' || v_contract.numero_contrato || ' com ' ||
        v_contract.nome_razao_social || ' vence em ' ||
        TO_CHAR(v_contract.data_vigencia_fim, 'DD/MM/YYYY') || '.',
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
    SELECT c.id, c.numero_contrato, c.data_vigencia_fim,
           sp.nome_razao_social
      FROM public.contracts c
      JOIN public.service_providers sp ON sp.id = c.provider_id
     WHERE c.company_id = p_company_id
       AND c.status NOT IN ('cancelado', 'encerrado')
       AND c.vigencia_indeterminada = FALSE
       AND c.data_vigencia_fim < CURRENT_DATE
  LOOP
    INSERT INTO public.compliance_alerts
      (company_id, contract_id, tipo, titulo, descricao, gravidade, data_referencia)
    VALUES (
      p_company_id, v_contract.id,
      'contrato_vencido',
      'Contrato vencido',
      'Contrato ' || v_contract.numero_contrato || ' com ' ||
        v_contract.nome_razao_social || ' venceu em ' ||
        TO_CHAR(v_contract.data_vigencia_fim, 'DD/MM/YYYY') ||
        ' e não foi encerrado ou renovado.',
      'critico',
      v_contract.data_vigencia_fim::TIMESTAMPTZ
    );
    v_count := v_count + 1;
  END LOOP;

  -- Contratos aguardando assinatura há mais de 7 dias
  FOR v_contract IN
    SELECT c.id, c.numero_contrato, c.created_at,
           sp.nome_razao_social
      FROM public.contracts c
      JOIN public.service_providers sp ON sp.id = c.provider_id
     WHERE c.company_id = p_company_id
       AND c.status = 'aguardando_assinatura'
       AND c.created_at < NOW() - INTERVAL '7 days'
  LOOP
    INSERT INTO public.compliance_alerts
      (company_id, contract_id, tipo, titulo, descricao, gravidade, data_referencia)
    VALUES (
      p_company_id, v_contract.id,
      'assinatura_pendente',
      'Assinatura pendente há mais de 7 dias',
      'Contrato ' || v_contract.numero_contrato || ' com ' ||
        v_contract.nome_razao_social || ' aguarda assinatura desde ' ||
        TO_CHAR(v_contract.created_at, 'DD/MM/YYYY') || '.',
      'importante',
      v_contract.created_at
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  RAISE NOTICE 'Migration 004 aplicada. Templates padrão inseridos. Função generate_compliance_alerts criada.';
END $$;
