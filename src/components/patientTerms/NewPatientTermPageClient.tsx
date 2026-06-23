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
  company: Company;
}

const STEPS = [
  { id: 1, titulo: 'Paciente',   descricao: 'Dados do paciente',      icone: '👤' },
  { id: 2, titulo: 'Serviço',    descricao: 'Tipo e condições',        icone: '📋' },
  { id: 3, titulo: 'Financeiro', descricao: 'Valores e regras',        icone: '💰' },
  { id: 4, titulo: 'Revisão',    descricao: 'Consentimentos e salvar', icone: '✅' },
];

export function NewPatientTermPageClient({ company }: NewPatientTermPageClientProps) {
  const router = useRouter();

  const [form,        setForm]        = useState<PatientTermFormData>(EMPTY_PATIENT_TERM_FORM);
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
    <div className="max-w-4xl mx-auto">
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
