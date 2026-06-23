'use client';

// ================================================================
// EditPatientModal — modal de edição de paciente
// PATCH /api/patients/[id] com campos administrativos apenas.
// Sem campos clínicos.
// ================================================================

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { maskCPF, maskPhone, maskCEP, maskRG, capitalizeName } from '@/lib/masks';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
             'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

async function fetchCEP(cep: string) {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const r = await fetch(`/api/cep?cep=${digits}`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

interface EditPatientModalProps {
  patient:  any;
  onClose:  () => void;
  onSaved:  (updated: any) => void;
}

export function EditPatientModal({ patient, onClose, onSaved }: EditPatientModalProps) {
  const [form, setForm]       = useState<Record<string, any>>({
    nome_completo:             patient.nome_completo             || '',
    cpf:                       patient.cpf                       || '',
    rg:                        patient.rg                        || '',
    data_nascimento:           patient.data_nascimento            || '',
    telefone:                  patient.telefone                   || '',
    email:                     patient.email                     || '',
    cep:                       patient.cep                       || '',
    logradouro:                patient.logradouro                 || '',
    numero:                    patient.numero                    || '',
    complemento:               patient.complemento               || '',
    bairro:                    patient.bairro                    || '',
    cidade:                    patient.cidade                    || '',
    uf:                        patient.uf                        || '',
    is_menor:                  patient.is_menor                  ?? false,
    observacao_administrativa: patient.observacao_administrativa  || '',
  });
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState<string | null>(null);

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleCepBlur() {
    const r = await fetchCEP(form.cep);
    if (r?.logradouro) {
      setForm(prev => ({
        ...prev,
        logradouro: r.logradouro || '',
        bairro:     r.bairro     || '',
        cidade:     r.localidade || '',
        uf:         r.uf         || '',
      }));
    }
  }

  async function handleSave() {
    if (!form.nome_completo.trim()) {
      setError('Nome completo é obrigatório'); return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patient: form }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao salvar' }));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      const { patient: updated } = await res.json();
      toast.success('Paciente atualizado');
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-brand-900 text-lg">Editar Paciente</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Identificação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="cc-label">Nome completo <span className="text-red-500">*</span></label>
              <input type="text"
                value={form.nome_completo}
                onChange={e => set('nome_completo', capitalizeName(e.target.value))}
                className={clsx('cc-input w-full', !form.nome_completo.trim() && 'border-red-300')} />
            </div>
            <div>
              <label className="cc-label">CPF</label>
              <input type="text" maxLength={14}
                value={maskCPF(form.cpf)}
                onChange={e => set('cpf', e.target.value)}
                placeholder="000.000.000-00" className="cc-input w-full" />
            </div>
            <div>
              <label className="cc-label">RG</label>
              <input type="text"
                value={form.rg}
                onChange={e => set('rg', maskRG(e.target.value))}
                className="cc-input w-full" />
            </div>
            <div>
              <label className="cc-label">Data de nascimento</label>
              <input type="date"
                value={form.data_nascimento}
                max={todayISO()}
                onChange={e => set('data_nascimento', e.target.value)}
                className="cc-input w-full" />
            </div>
            <div>
              <label className="cc-label">WhatsApp</label>
              <input type="text" maxLength={15}
                value={maskPhone(form.telefone)}
                onChange={e => set('telefone', e.target.value)}
                placeholder="(00) 00000-0000" className="cc-input w-full" />
            </div>
            <div className="sm:col-span-2">
              <label className="cc-label">E-mail</label>
              <input type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="cc-input w-full" />
            </div>
          </div>

          {/* Menor */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_menor}
              onChange={e => set('is_menor', e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded" />
            <span className="text-sm font-medium text-slate-700">Paciente menor de idade</span>
          </label>

          {/* Endereço */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Endereço</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="cc-label">CEP</label>
                <input type="text" maxLength={9}
                  value={maskCEP(form.cep)}
                  onChange={e => set('cep', e.target.value)}
                  onBlur={handleCepBlur}
                  placeholder="00000-000" className="cc-input w-full" />
              </div>
              <div>
                <label className="cc-label">Logradouro</label>
                <input type="text" value={form.logradouro}
                  onChange={e => set('logradouro', e.target.value)}
                  className="cc-input w-full" />
              </div>
              <div>
                <label className="cc-label">Número</label>
                <input type="text" value={form.numero}
                  onChange={e => set('numero', e.target.value)}
                  className="cc-input w-full" />
              </div>
              <div>
                <label className="cc-label">Complemento</label>
                <input type="text" value={form.complemento}
                  onChange={e => set('complemento', e.target.value)}
                  className="cc-input w-full" />
              </div>
              <div>
                <label className="cc-label">Bairro</label>
                <input type="text" value={form.bairro}
                  onChange={e => set('bairro', e.target.value)}
                  className="cc-input w-full" />
              </div>
              <div>
                <label className="cc-label">Cidade</label>
                <input type="text" value={form.cidade}
                  onChange={e => set('cidade', e.target.value)}
                  className="cc-input w-full" />
              </div>
              <div>
                <label className="cc-label">UF</label>
                <select value={form.uf}
                  onChange={e => set('uf', e.target.value)}
                  className="cc-input w-full max-w-[120px]">
                  <option value="">—</option>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="cc-label">Observação administrativa</label>
            <textarea rows={2}
              value={form.observacao_administrativa}
              onChange={e => set('observacao_administrativa', e.target.value)}
              placeholder="Somente informações administrativas..."
              className="cc-textarea w-full" />
            <p className="text-2xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              Não registre diagnóstico, evolução, queixa clínica, conduta, CID, medicação ou informações de prontuário.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} disabled={saving} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex items-center gap-2">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
              : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
