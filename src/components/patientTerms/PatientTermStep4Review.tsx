'use client';

// ================================================================
// Step 4 — Revisão, Consentimentos e Salvar
// NÃO inclui campos clínicos.
// Preview gerado pelo generator local (não executa HTML externo).
// ================================================================

import { useEffect, useMemo } from 'react';
import {
  ChevronLeft, Save, Printer, CheckCircle, AlertTriangle, Loader2,
} from 'lucide-react';
import { generatePatientTermHTML } from '@/lib/patientTerms/generator';
import type { PatientTermFormData, PatientTermFormConsentimentos } from '@/lib/patientTerms/types';
import type { Company } from '@/types';
import clsx from 'clsx';

function useScrollTop() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
}

interface Step4Props {
  form:     PatientTermFormData;
  company:  Company;
  saving:   boolean;
  error:    string | null;
  onChange: (partial: Partial<PatientTermFormData>) => void;
  onBack:   () => void;
  onSave:   () => void;
}

const CONSENTIMENTOS_LABELS: Array<{
  key: keyof PatientTermFormConsentimentos;
  label: string;
  onlyIfOnline?: boolean;
  onlyIfMenor?:  boolean;
}> = [
  { key: 'consentimento_sigilo',            label: 'Declaro ciência sobre o sigilo profissional e seus limites legais (notificação compulsória, risco de vida, ordem judicial).' },
  { key: 'consentimento_lgpd',              label: 'Autorizo o tratamento dos meus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e as finalidades descritas neste termo.' },
  { key: 'consentimento_contato_admin',     label: 'Autorizo o contato administrativo por WhatsApp e/ou e-mail para confirmação de sessões, avisos e comunicações administrativas.' },
  { key: 'consentimento_sem_promessa',      label: 'Declaro ciência de que não há promessa de resultado terapêutico específico. Resultados dependem de múltiplos fatores individuais.' },
  { key: 'consentimento_online',            label: 'Consinto expressamente com o atendimento na modalidade online, declarando ciência sobre as condições de sigilo, ambiente reservado, vedação de gravação e limitações em situações de emergência.', onlyIfOnline: true },
  { key: 'consentimento_responsavel_menor', label: 'Autorizo expressamente o atendimento do(a) menor e assumo as obrigações deste termo na qualidade de responsável legal.', onlyIfMenor: true },
];

export function PatientTermStep4Review({
  form, company, saving, error, onChange, onBack, onSave,
}: Step4Props) {
  useScrollTop();

  const { paciente, servico, consentimentos } = form;
  const isOnline = servico.modalidade === 'online' || servico.tipo_termo === 'online_adulto';
  const isMenor  = paciente.is_menor;

  // Preview gerado em useMemo — atualiza apenas quando o formData muda.
  // generatePatientTermHTML é uma função local — não chama IA nem banco.
  const previewHtml = useMemo(() => {
    try {
      return generatePatientTermHTML(form, company, 'TP-PREVIEW');
    } catch {
      return '<p style="color:red;padding:16px;">Erro ao gerar preview.</p>';
    }
  }, [form, company]);

  function updateConsent(key: keyof PatientTermFormConsentimentos, value: boolean) {
    onChange({ consentimentos: { ...consentimentos, [key]: value } });
  }

  // Consentimentos obrigatórios para esta configuração
  const obrigatorios = CONSENTIMENTOS_LABELS.filter(c => {
    if (c.onlyIfOnline && !isOnline) return false;
    if (c.onlyIfMenor  && !isMenor)  return false;
    return true;
  });

  const todosConsentidos = obrigatorios.every(c => consentimentos[c.key]);

  function handlePrint() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(previewHtml);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="space-y-6">
      {/* ── Preview do termo ── */}
      <div className="cc-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-sm text-brand-900">Pré-visualização do Termo</h2>
          <button type="button" onClick={handlePrint}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Printer className="w-3.5 h-3.5" /> Imprimir / Salvar PDF
          </button>
        </div>
        <div
          className="contract-preview max-h-[500px] overflow-y-auto p-4 bg-white text-sm"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      {/* ── Consentimentos ── */}
      <div className="cc-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <h2 className="font-semibold text-sm text-brand-900">Consentimentos</h2>
        </div>
        <p className="text-2xs text-slate-400 mb-5">
          Todos os consentimentos abaixo são obrigatórios para finalizar o termo.
        </p>

        {obrigatorios.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Nenhum consentimento específico exigido para esta configuração.</p>
        ) : (
          <div className="space-y-3">
            {obrigatorios.map(({ key, label }) => (
            <label key={key}
              className={clsx(
                'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                consentimentos[key]
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-slate-200 hover:border-brand-200'
              )}>
              <input
                type="checkbox"
                checked={consentimentos[key]}
                onChange={e => updateConsent(key, e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded mt-0.5 flex-shrink-0"
              />
              <span className="text-xs text-slate-700 leading-relaxed">{label}</span>
            </label>
          ))}
          </div>
        )}

        {!todosConsentidos && obrigatorios.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs">Todos os consentimentos acima precisam ser marcados antes de salvar.</p>
          </div>
        )}
      </div>

      {/* ── Erro de API ── */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* ── Aviso disclaimer ── */}
      <div className="text-2xs text-slate-400 text-center px-4">
        ⚠️ Este termo é um documento administrativo e não substitui aconselhamento jurídico especializado.
        As cláusulas foram geradas com base nas informações fornecidas e seguem orientações técnicas gerais.
      </div>

      {/* ── Ações ── */}
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-2">
        <button type="button" onClick={onBack}
          className="btn-secondary flex items-center justify-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !todosConsentidos}
          className={clsx(
            'flex items-center justify-center gap-2 btn-primary',
            (!todosConsentidos || saving) && 'opacity-50 cursor-not-allowed'
          )}>
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
          ) : (
            <><Save className="w-4 h-4" /> Salvar Termo</>
          )}
        </button>
      </div>
    </div>
  );
}
