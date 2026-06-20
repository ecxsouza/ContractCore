'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { StepIndicator } from '@/components/contract/StepIndicator';
import { Step1Provider } from '@/components/contract/Step1Provider';
import { Step2Service } from '@/components/contract/Step2Service';
import { Step3Remuneration } from '@/components/contract/Step3Remuneration';
import { Step4Review } from '@/components/contract/Step4Review';
import type { ContractFormData, Company } from '@/types';
import toast from 'react-hot-toast';

interface NewContractPageClientProps {
  company:      Company;
  templateData?: Record<string, unknown> | null;
}

const EMPTY_FORM: ContractFormData = {
  provider: {
    tipo_pessoa: 'PJ',
    nome_razao_social: '', nome_fantasia: '', cpf: '', cnpj: '', rg: '',
    profissao: 'psicologo', especialidade: '',
    conselho_profissional: 'CFP / CRP — Conselho Federal de Psicologia e Conselho Regional de Psicologia',
    numero_registro_conselho: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    email: '', telefone: '', nacionalidade: 'Brasileira',
  },
  service: {
    objeto: '', descricao_servicos: '', local_prestacao: '',
    modalidade: 'presencial', periodicidade: 'conforme agenda pactuada',
    agenda_pactuada: '', exclusividade: false, recursos_disponibilizados: [],
  },
  remuneration: {
    modelos: ['por_atendimento'], valor_descricao: '',
    data_pagamento: 'todo dia 05 do mês seguinte à prestação dos serviços',
    formas_pagamento: ['pix'], emite_nota_fiscal: 'obrigatorio',
  },
  anexos: ['confidencialidade', 'lgpd', 'sem_vinculo_clt'],
  vigencia_indeterminada: true,
  data_vigencia_inicio: new Date().toISOString().split('T')[0],
};

const STEPS = [
  { id: 1, titulo: 'Prestador',   descricao: 'Dados do profissional',     icone: '👤' },
  { id: 2, titulo: 'Serviço',     descricao: 'Objeto e condições',        icone: '📋' },
  { id: 3, titulo: 'Remuneração', descricao: 'Honorários e pagamento',    icone: '💰' },
  { id: 4, titulo: 'Revisão',     descricao: 'Revise e gere o contrato',  icone: '⚖️' },
];

export function NewContractPageClient({ company, templateData }: NewContractPageClientProps) {
  const router  = useRouter();
  const [step, setStep]     = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ContractFormData>(() => {
    const tplProvider    = (templateData?.provider_data     as Partial<ContractFormData['provider']>)     || {};
    const tplService     = (templateData?.service_data      as Partial<ContractFormData['service']>)      || {};
    const tplRemuneration= (templateData?.remuneration_data  as Partial<ContractFormData['remuneration']>) || {};
    const tplAnexos      = (templateData?.anexos_padrao     as ContractFormData['anexos'])                || EMPTY_FORM.anexos;

    return {
      ...EMPTY_FORM,
      anexos: tplAnexos.length > 0 ? tplAnexos : EMPTY_FORM.anexos,
      provider: {
        ...EMPTY_FORM.provider,
        ...tplProvider,
      },
      service: {
        ...EMPTY_FORM.service,
        ...tplService,
        local_prestacao: tplService.local_prestacao || (company.logradouro
          ? `${company.logradouro}, ${company.numero}, ${company.bairro}, ${company.cidade}/${company.uf}`
          : ''),
      },
      remuneration: {
        ...EMPTY_FORM.remuneration,
        ...tplRemuneration,
        emite_nota_fiscal: 'obrigatorio' as const,
      },
    };
  });

  function goToStep(n: number) {
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const updateProvider     = useCallback((d: any) => setForm(p => ({ ...p, provider:     { ...p.provider,     ...d } })), []);
  const updateService      = useCallback((d: any) => setForm(p => ({ ...p, service:      { ...p.service,      ...d } })), []);
  const updateRemuneration = useCallback((d: any) => setForm(p => ({ ...p, remuneration: { ...p.remuneration, ...d } })), []);
  const updateRoot         = useCallback((d: any) => setForm(p => ({ ...p, ...d })),                                      []);

  // Recebe o ID do prestador quando os dados vieram de "Usar prestador já
  // cadastrado", para que /api/contracts reutilize o registro existente
  // em vez de criar um novo (corrige duplicação de prestadores).
  const handleSelectExistingProvider = useCallback((providerId: string | null) => {
    setForm(p => ({ ...p, provider_id_selecionado: providerId ?? undefined }));
  }, []);

  async function handleSave(overrideData?: Partial<ContractFormData>) {
    setSaving(true);
    try {
      // overrideData garante que dados confirmados no mesmo clique (ex:
      // revisão IA aceita) sejam usados mesmo que o estado `form` do
      // componente pai ainda não tenha sido propagado pelo React.
      const formToSave = overrideData ? { ...form, ...overrideData } : form;
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: formToSave }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar contrato');
      }
      const { contract } = await res.json();
      toast.success('Contrato criado com sucesso!');
      router.push(`/contracts/${contract.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout company={company}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-900">Novo Contrato de Prestação de Serviços</h1>
          <p className="text-slate-500 text-sm mt-1">Preencha os dados em etapas. O contrato é gerado automaticamente.</p>
        </div>

        <StepIndicator steps={STEPS} currentStep={step} />

        <div className="mt-8">
          {step === 1 && (
            <Step1Provider
              data={form.provider}
              onChange={updateProvider}
              onNext={() => goToStep(2)}
              onSelectExisting={handleSelectExistingProvider}
            />
          )}
          {step === 2 && (
            <Step2Service
              data={form.service} company={company}
              profissao={form.provider.profissao}
              onChange={updateService}
              onBack={() => goToStep(1)} onNext={() => goToStep(3)}
            />
          )}
          {step === 3 && (
            <Step3Remuneration
              data={form.remuneration}
              tipoPessoa={form.provider.tipo_pessoa}
              cidade={company.cidade}
              onChange={updateRemuneration}
              onBack={() => goToStep(2)} onNext={() => goToStep(4)}
            />
          )}
          {step === 4 && (
            <Step4Review
              formData={form} company={company}
              onChange={updateRoot}
              onBack={() => goToStep(3)}
              onGoToStep={goToStep}
              onSave={handleSave} saving={saving}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
