'use client';

// ================================================================
// NewPatientTermPageClient — Orquestrador do wizard Novo Termo
// Controla estado global do formulário e navegação entre etapas.
// Salva via POST /api/patient-terms e redireciona ao termo criado.
// NÃO inclui campos clínicos.
// ================================================================

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Company } from '@/types';
import type { PatientTermFormData } from '@/lib/patientTerms/types';
import { EMPTY_PATIENT_TERM_FORM } from '@/lib/patientTerms/types';
import { PatientTermStepIndicator } from './PatientTermStepIndicator';
import { PatientTermStep1Patient  } from './PatientTermStep1Patient';
import { PatientTermStep2Service  } from './PatientTermStep2Service';
import { PatientTermStep3Financial} from './PatientTermStep3Financial';
import { PatientTermStep4Review   } from './PatientTermStep4Review';
import toast from 'react-hot-toast';

interface NewPatientTermPageClientProps {
  company:              Company;
  initialPatient?:      any | null;
  initialResponsibles?: any[];
  duplicateFromTerm?:   any | null;
}

const STEPS = [
  { id: 1, titulo: 'Paciente',   descricao: 'Dados do paciente',      icone: '👤' },
  { id: 2, titulo: 'Serviço',    descricao: 'Tipo e condições',        icone: '📋' },
  { id: 3, titulo: 'Financeiro', descricao: 'Valores e regras',        icone: '💰' },
  { id: 4, titulo: 'Revisão',    descricao: 'Consentimentos e salvar', icone: '✅' },
];

// Monta o formData inicial a partir de dados de paciente e/ou termo existente.
// Consentimentos SEMPRE voltam false — o usuário deve confirmar novamente.
// Não copia: id, numero_termo, termo_html, termo_html_original, status, created_at, assinatura.
function buildInitialForm(
  initialPatient:      any | null,
  initialResponsibles: any[],
  duplicateFromTerm:   any | null,
): PatientTermFormData {
  const base = { ...EMPTY_PATIENT_TERM_FORM };

  // Preencher paciente se disponível
  if (initialPatient) {
    base.paciente = {
      ...base.paciente,
      nome_completo:             initialPatient.nome_completo             || '',
      cpf:                       initialPatient.cpf                       || '',
      rg:                        initialPatient.rg                        || '',
      data_nascimento:           initialPatient.data_nascimento            || '',
      telefone:                  initialPatient.telefone                   || '',
      email:                     initialPatient.email                     || '',
      cep:                       initialPatient.cep                       || '',
      logradouro:                initialPatient.logradouro                 || '',
      numero:                    initialPatient.numero                    || '',
      complemento:               initialPatient.complemento               || '',
      bairro:                    initialPatient.bairro                    || '',
      cidade:                    initialPatient.cidade                    || '',
      uf:                        initialPatient.uf                        || '',
      is_menor:                  initialPatient.is_menor                  ?? false,
      observacao_administrativa: initialPatient.observacao_administrativa  || '',
      paciente_id_selecionado:   initialPatient.id,
    };
  }

  // Preencher responsáveis se disponíveis
  const respLegal = initialResponsibles.find((r: any) => r.is_responsavel_legal);
  const respFin   = initialResponsibles.find((r: any) => r.is_responsavel_financeiro && !r.is_responsavel_legal);
  if (respLegal) {
    base.responsavel_legal = {
      ...base.responsavel_legal,
      nome_completo:  respLegal.nome_completo || '',
      cpf:            respLegal.cpf           || '',
      rg:             respLegal.rg            || '',
      telefone:       respLegal.telefone      || '',
      email:          respLegal.email         || '',
      grau_parentesco: respLegal.grau_parentesco || '',
      cep:            respLegal.cep           || '',
      logradouro:     respLegal.logradouro    || '',
      numero:         respLegal.numero        || '',
      complemento:    respLegal.complemento   || '',
      bairro:         respLegal.bairro        || '',
      cidade:         respLegal.cidade        || '',
      uf:             respLegal.uf            || '',
      is_responsavel_legal:      true,
      is_responsavel_financeiro: !respFin,
      responsavel_id_selecionado: respLegal.id,
    };
    base.mesmo_responsavel = !respFin;
  }
  if (respFin) {
    base.responsavel_financeiro = {
      ...base.responsavel_financeiro,
      nome_completo:  respFin.nome_completo || '',
      cpf:            respFin.cpf           || '',
      rg:             respFin.rg            || '',
      telefone:       respFin.telefone      || '',
      email:          respFin.email         || '',
      grau_parentesco: respFin.grau_parentesco || '',
      cep:            respFin.cep           || '',
      logradouro:     respFin.logradouro    || '',
      numero:         respFin.numero        || '',
      complemento:    respFin.complemento   || '',
      bairro:         respFin.bairro        || '',
      cidade:         respFin.cidade        || '',
      uf:             respFin.uf            || '',
      is_responsavel_legal:      false,
      is_responsavel_financeiro: true,
      responsavel_id_selecionado: respFin.id,
    };
    base.mesmo_responsavel = false;
  }

  // Se vier de duplicação, copiar serviço, financeiro e regras — mas NÃO consentimentos
  if (duplicateFromTerm) {
    const t = duplicateFromTerm;
    base.servico = {
      ...base.servico,
      tipo_termo:              t.tipo_termo              || base.servico.tipo_termo,
      area_servico:            t.area_servico            || '',
      profissional_responsavel: t.profissional_responsavel || '',
      modalidade:              t.modalidade              || 'presencial',
      local_atendimento:       t.local_atendimento       || '',
      plataforma_online:       t.plataforma_online       || '',
      frequencia:              t.frequencia              || base.servico.frequencia,
      duracao_sessao:          t.duracao_sessao          || base.servico.duracao_sessao,
      quantidade_sessoes:      t.quantidade_sessoes      ?? null,
      data_inicio_atendimento: '',      // não copiar data — é um novo contrato
      vigencia_indeterminada:  t.vigencia_indeterminada  ?? true,
      data_fim_atendimento:    '',
    };
    base.financeiro = {
      ...base.financeiro,
      tipo_pagamento:       t.tipo_pagamento       || 'particular',
      valor_sessao:         t.valor_sessao ? String(t.valor_sessao) : '',
      valor_pacote:         t.valor_pacote ? String(t.valor_pacote) : '',
      forma_pagamento:      t.forma_pagamento       || ['pix'],
      vencimento_pagamento: t.vencimento_pagamento  || '',
      emite_nota_fiscal:    t.emite_nota_fiscal     || 'obrigatorio',
    };
    base.regras = {
      regra_falta:               t.regra_falta               || base.regras.regra_falta,
      regra_cancelamento:        t.regra_cancelamento         || base.regras.regra_cancelamento,
      antecedencia_cancelamento: t.antecedencia_cancelamento  || base.regras.antecedencia_cancelamento,
      regra_remarcacao:          t.regra_remarcacao           || base.regras.regra_remarcacao,
      regra_atraso:              t.regra_atraso               || base.regras.regra_atraso,
      regra_reajuste:            t.regra_reajuste             || base.regras.regra_reajuste,
      periodicidade_reajuste:    t.periodicidade_reajuste     || base.regras.periodicidade_reajuste,
      aviso_previo_reajuste:     t.aviso_previo_reajuste      || base.regras.aviso_previo_reajuste,
      regra_encerramento:        t.regra_encerramento         || base.regras.regra_encerramento,
    };
  }

  // Consentimentos SEMPRE false — o usuário deve confirmar novamente
  base.consentimentos = { ...EMPTY_PATIENT_TERM_FORM.consentimentos };

  return base;
}

export function NewPatientTermPageClient({
  company,
  initialPatient    = null,
  initialResponsibles = [],
  duplicateFromTerm = null,
}: NewPatientTermPageClientProps) {
  const router = useRouter();

  const [form,        setForm]        = useState<PatientTermFormData>(() =>
    buildInitialForm(initialPatient, initialResponsibles, duplicateFromTerm)
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Merge parcial do estado (mantém profundidade 1 — campos aninhados
  // passados como objetos completos pelos Steps individuais)
  const handleChange = useCallback((partial: Partial<PatientTermFormData>) => {
    setForm(prev => ({ ...prev, ...partial }));
  }, []);

  function goToStep(n: number) {
    setCurrentStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/patient-terms', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ formData: form }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao salvar' }));
        throw new Error(err.error || `Erro ${res.status}`);
      }

      const { term } = await res.json();
      toast.success('Termo criado com sucesso!');

      // Redireciona para o detalhe do termo criado (página criada no Prompt F)
      if (term?.id) {
        router.push(`/patient-terms/${term.id}`);
      } else {
        router.push('/patient-terms');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar o termo. Tente novamente.';
      setError(msg);
      toast.error(msg);
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Novo Termo de Serviço ao Paciente</h1>
        <p className="text-slate-500 text-sm mt-1">
          Preencha as etapas abaixo para gerar o termo administrativo de atendimento.
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <PatientTermStepIndicator steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Etapas */}
      {currentStep === 1 && (
        <PatientTermStep1Patient
          data={form}
          onChange={handleChange}
          onNext={() => goToStep(2)}
        />
      )}

      {currentStep === 2 && (
        <PatientTermStep2Service
          data={form}
          onChange={handleChange}
          onBack={() => goToStep(1)}
          onNext={() => goToStep(3)}
        />
      )}

      {currentStep === 3 && (
        <PatientTermStep3Financial
          data={form}
          onChange={handleChange}
          onBack={() => goToStep(2)}
          onNext={() => goToStep(4)}
        />
      )}

      {currentStep === 4 && (
        <PatientTermStep4Review
          form={form}
          company={company}
          saving={saving}
          error={error}
          onChange={handleChange}
          onBack={() => goToStep(3)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
