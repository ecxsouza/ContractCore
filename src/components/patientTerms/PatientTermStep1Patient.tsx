'use client';

// ================================================================
// Step 1 — Paciente e Responsáveis
// Validações de CPF, e-mail e WhatsApp idênticas ao Step1Provider.
// CEP atômico (Partial). Data sem dígitos de ano > 4.
// NÃO inclui campos clínicos.
// ================================================================

import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, User, Users, AlertTriangle } from 'lucide-react';
import { CheckCircle, XCircle } from 'lucide-react';
import type {
  PatientTermFormData,
  PatientTermFormPaciente,
  PatientTermFormResponsavel,
  PatientResponsibleKinship,
} from '@/lib/patientTerms/types';
import {
  maskCPF, maskPhone, maskCEP, maskRG, capitalizeName,
  validateCPF, onlyDigits,
} from '@/lib/masks';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ── Helpers ──────────────────────────────────────────────────────

function useScrollTop() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
}

// Mesmo padrão do Step1Provider
function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// Mesma lógica do Step1Provider: ao menos 10 dígitos
function isValidPhone(v: string): boolean {
  return onlyDigits(v).length >= 10;
}

// Calcula menor de idade sem new Date(str) para evitar fuso
function isMenorDeIdade(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return false;
  const today        = new Date();
  let   age          = today.getFullYear() - year;
  const currentMonth = today.getMonth() + 1;
  const currentDay   = today.getDate();
  if (currentMonth < month || (currentMonth === month && currentDay < day)) age--;
  return age < 18;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isValidISODateYear(value: string): boolean {
  if (!value) return true;
  const [year] = value.split('-');
  return /^\d{4}$/.test(year);
}

// Ícone de status de campo — igual ao FieldStatus do Step1Provider
function FieldStatus({ valid, touched }: { valid: boolean; touched: boolean }) {
  if (!touched) return null;
  return valid
    ? <CheckCircle className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    : <XCircle    className="w-4 h-4 text-red-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />;
}

// CEP atômico
type AddressData = Pick<PatientTermFormPaciente,
  'cep'|'logradouro'|'numero'|'complemento'|'bairro'|'cidade'|'uf'>;

async function fetchCEP(cep: string) {
  const digits = cep.replace(/\D/g,'');
  if (digits.length !== 8) return null;
  try {
    const r = await fetch(`/api/cep?cep=${digits}`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
             'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const GRAUS_PARENTESCO: { value: PatientResponsibleKinship; label: string }[] = [
  { value: 'mae',     label: 'Mãe'       },
  { value: 'pai',     label: 'Pai'        },
  { value: 'avo',     label: 'Avó / Avô'  },
  { value: 'tutor',   label: 'Tutor(a)'   },
  { value: 'curador', label: 'Curador(a)' },
  { value: 'conjuge', label: 'Cônjuge'    },
  { value: 'outro',   label: 'Outro'      },
];

// ── Hook: busca pacientes cadastrados da empresa (mesmo padrão do Step1Provider) ──
function useExistingPatients() {
  const [patients, setPatients] = useState<{
    id: string; nome_completo: string; cpf?: string; rg?: string;
    data_nascimento?: string; email?: string; telefone?: string;
    cep?: string; logradouro?: string; numero?: string; complemento?: string;
    bairro?: string; cidade?: string; uf?: string;
    is_menor?: boolean; observacao_administrativa?: string;
  }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/patients')
      .then(r => r.ok ? r.json() : { patients: [] })
      .then(d => setPatients(d.patients || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { patients, loading };
}

// ── Bloco de endereço atômico ─────────────────────────────────────
interface AddressBlockProps {
  data:     AddressData;
  onChange: (updates: Partial<AddressData>) => void;
}

function AddressBlock({ data, onChange }: AddressBlockProps) {
  async function handleCepBlur() {
    const r = await fetchCEP(data.cep);
    if (r?.logradouro) {
      onChange({
        logradouro: r.logradouro  || '',
        bairro:     r.bairro      || '',
        cidade:     r.localidade  || '',
        uf:         r.uf          || '',
      });
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="cc-label">CEP</label>
        <div className="relative">
          <input type="text" maxLength={9}
            value={maskCEP(data.cep)}
            onChange={e => onChange({ cep: e.target.value })}
            onBlur={handleCepBlur}
            placeholder="00000-000"
            className="cc-input w-full pr-8" />
          <FieldStatus
            valid={onlyDigits(data.cep).length === 8}
            touched={data.cep.length > 0} />
        </div>
      </div>
      <div>
        <label className="cc-label">Logradouro</label>
        <input type="text" value={data.logradouro}
          onChange={e => onChange({ logradouro: e.target.value })}
          placeholder="Rua, Avenida..." className="cc-input w-full" />
      </div>
      <div>
        <label className="cc-label">Número</label>
        <input type="text" value={data.numero}
          onChange={e => onChange({ numero: e.target.value })}
          placeholder="123" className="cc-input w-full" />
      </div>
      <div>
        <label className="cc-label">Complemento</label>
        <input type="text" value={data.complemento}
          onChange={e => onChange({ complemento: e.target.value })}
          placeholder="Apto, Bloco..." className="cc-input w-full" />
      </div>
      <div>
        <label className="cc-label">Bairro</label>
        <input type="text" value={data.bairro}
          onChange={e => onChange({ bairro: e.target.value })}
          placeholder="Bairro" className="cc-input w-full" />
      </div>
      <div>
        <label className="cc-label">Cidade</label>
        <input type="text" value={data.cidade}
          onChange={e => onChange({ cidade: e.target.value })}
          placeholder="Cidade" className="cc-input w-full" />
      </div>
      <div>
        <label className="cc-label">UF</label>
        <select value={data.uf}
          onChange={e => onChange({ uf: e.target.value })}
          className="cc-input w-full max-w-[120px]">
          <option value="">—</option>
          {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Bloco de responsável com validações ──────────────────────────
interface ResponsavelBlockProps {
  titulo:  string;
  data:    PatientTermFormResponsavel;
  onChange: (field: keyof PatientTermFormResponsavel, value: string | boolean) => void;
  showLegalBadge?: boolean;
  showFinBadge?:   boolean;
}

function ResponsavelBlock({ titulo, data, onChange, showLegalBadge, showFinBadge }: ResponsavelBlockProps) {
  const cpfDigits = onlyDigits(data.cpf);
  const cpfValid  = cpfDigits.length === 0 || validateCPF(cpfDigits);

  return (
    <div className="cc-card p-5 border-brand-100 bg-blue-50/30">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-brand-600 flex-shrink-0" />
        <h3 className="font-semibold text-sm text-brand-900">{titulo}</h3>
        {showLegalBadge && <span className="text-2xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">Autoriza atendimento</span>}
        {showFinBadge   && <span className="text-2xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Responsável financeiro</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="cc-label">Nome completo <span className="text-red-500">*</span></label>
          <input type="text" value={data.nome_completo}
            onChange={e => onChange('nome_completo', capitalizeName(e.target.value))}
            placeholder="Nome do responsável"
            className={clsx('cc-input w-full', !data.nome_completo.trim() && 'border-red-300')} />
        </div>
        <div>
          <label className="cc-label">CPF <span className="text-red-500">*</span></label>
          <div className="relative">
            <input type="text" maxLength={14} value={maskCPF(data.cpf)}
              onChange={e => onChange('cpf', e.target.value)}
              placeholder="000.000.000-00"
              className={clsx('cc-input w-full pr-8', !data.cpf.trim() && 'border-red-300')} />
            <FieldStatus
              valid={cpfDigits.length === 11 && validateCPF(cpfDigits)}
              touched={cpfDigits.length > 0} />
          </div>
          {cpfDigits.length === 11 && !cpfValid && (
            <p className="text-red-500 text-xs mt-1">CPF inválido.</p>
          )}
        </div>
        <div>
          <label className="cc-label">RG</label>
          <input type="text" value={data.rg}
            onChange={e => onChange('rg', maskRG(e.target.value))}
            placeholder="RG" className="cc-input w-full" />
        </div>
        <div>
          <label className="cc-label">WhatsApp</label>
          <div className="relative">
            <input type="text" maxLength={15} value={maskPhone(data.telefone)}
              onChange={e => onChange('telefone', e.target.value)}
              placeholder="(00) 00000-0000" className="cc-input w-full pr-8" />
            <FieldStatus
              valid={isValidPhone(data.telefone)}
              touched={onlyDigits(data.telefone).length > 0} />
          </div>
          {onlyDigits(data.telefone).length > 0 && !isValidPhone(data.telefone) && (
            <p className="text-red-500 text-xs mt-1">Número incompleto.</p>
          )}
        </div>
        <div>
          <label className="cc-label">E-mail</label>
          <div className="relative">
            <input type="email" value={data.email}
              onChange={e => onChange('email', e.target.value)}
              placeholder="email@exemplo.com" className="cc-input w-full pr-8" />
            <FieldStatus
              valid={isValidEmail(data.email)}
              touched={data.email.length > 0} />
          </div>
          {data.email.length > 0 && !isValidEmail(data.email) && (
            <p className="text-red-500 text-xs mt-1">E-mail inválido.</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="cc-label">Grau de parentesco</label>
          <select value={data.grau_parentesco}
            onChange={e => onChange('grau_parentesco', e.target.value)}
            className="cc-input w-full">
            <option value="">Selecione...</option>
            {GRAUS_PARENTESCO.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
interface Step1Props {
  data:     PatientTermFormData;
  onChange: (partial: Partial<PatientTermFormData>) => void;
  onNext:   () => void;
}

export function PatientTermStep1Patient({ data, onChange, onNext }: Step1Props) {
  useScrollTop();

  // ── Seleção de paciente existente (padrão Step1Provider) ──────────
  const { patients: existingPatients } = useExistingPatients();
  const [showPatientSelect, setShowPatientSelect] = useState(false);

  // Desestruturar data para uso no JSX e funções
  const { paciente, responsavel_legal, responsavel_financeiro, mesmo_responsavel } = data;

  function applyExistingPatient(p: typeof existingPatients[number]) {
    const dob = p.data_nascimento || '';
    onChange({
      paciente: {
        ...paciente,
        nome_completo:            p.nome_completo              || '',
        cpf:                      p.cpf                        || '',
        rg:                       p.rg                         || '',
        data_nascimento:          dob,
        email:                    p.email                      || '',
        telefone:                 p.telefone                   || '',
        cep:                      p.cep                        || '',
        logradouro:               p.logradouro                 || '',
        numero:                   p.numero                     || '',
        complemento:              p.complemento                || '',
        bairro:                   p.bairro                     || '',
        cidade:                   p.cidade                     || '',
        uf:                       p.uf                         || '',
        observacao_administrativa: p.observacao_administrativa  || '',
        is_menor: dob ? isMenorDeIdade(dob) : (p.is_menor ?? false),
      },
    });
    setShowPatientSelect(false);
    toast.success(`Dados de ${p.nome_completo} carregados!`);
  }

  function updatePaciente(field: keyof PatientTermFormPaciente, value: string | boolean) {
    const { paciente } = data;
    onChange({ paciente: { ...paciente, [field]: value } });
  }
  function updateRespLegal(field: keyof PatientTermFormResponsavel, value: string | boolean) {
    const { responsavel_legal } = data;
    onChange({ responsavel_legal: { ...responsavel_legal, [field]: value } });
  }
  function updateRespFin(field: keyof PatientTermFormResponsavel, value: string | boolean) {
    const { responsavel_financeiro } = data;
    onChange({ responsavel_financeiro: { ...responsavel_financeiro, [field]: value } });
  }
  function updatePacienteAddr(updates: Partial<PatientTermFormPaciente>) {
    const { paciente } = data;
    onChange({ paciente: { ...paciente, ...updates } });
  }

  function handleNext() {
    if (!paciente.nome_completo.trim()) {
      toast.error('Nome completo do paciente é obrigatório'); return;
    }
    const cpfDigits = onlyDigits(paciente.cpf);
    if (cpfDigits.length > 0 && !validateCPF(cpfDigits)) {
      toast.error('CPF do paciente inválido'); return;
    }
    if (paciente.email && !isValidEmail(paciente.email)) {
      toast.error('E-mail do paciente inválido'); return;
    }
    const pacientePhoneDigits = onlyDigits(paciente.telefone);
    if (pacientePhoneDigits.length > 0 && !isValidPhone(paciente.telefone)) {
      toast.error('WhatsApp do paciente inválido ou incompleto'); return;
    }
    const pacienteCepDigits = onlyDigits(paciente.cep);
    if (pacienteCepDigits.length > 0 && pacienteCepDigits.length !== 8) {
      toast.error('CEP do paciente inválido ou incompleto'); return;
    }
    if (paciente.is_menor) {
      if (!responsavel_legal.nome_completo.trim()) {
        toast.error('Nome do responsável legal é obrigatório para menor de idade'); return;
      }
      const rlCpf = onlyDigits(responsavel_legal.cpf);
      if (!rlCpf) { toast.error('CPF do responsável legal é obrigatório'); return; }
      if (!validateCPF(rlCpf)) { toast.error('CPF do responsável legal inválido'); return; }
      if (responsavel_legal.email && !isValidEmail(responsavel_legal.email)) {
        toast.error('E-mail do responsável legal inválido'); return;
      }
      const rlPhoneDigits = onlyDigits(responsavel_legal.telefone);
      if (rlPhoneDigits.length > 0 && !isValidPhone(responsavel_legal.telefone)) {
        toast.error('WhatsApp do responsável legal inválido ou incompleto'); return;
      }
      if (!mesmo_responsavel) {
        if (!responsavel_financeiro.nome_completo.trim()) {
          toast.error('Nome do responsável financeiro é obrigatório'); return;
        }
        const rfCpf = onlyDigits(responsavel_financeiro.cpf);
        if (!rfCpf) { toast.error('CPF do responsável financeiro é obrigatório'); return; }
        if (!validateCPF(rfCpf)) { toast.error('CPF do responsável financeiro inválido'); return; }
        if (responsavel_financeiro.email && !isValidEmail(responsavel_financeiro.email)) {
          toast.error('E-mail do responsável financeiro inválido'); return;
        }
        const rfPhoneDigits = onlyDigits(responsavel_financeiro.telefone);
        if (rfPhoneDigits.length > 0 && !isValidPhone(responsavel_financeiro.telefone)) {
          toast.error('WhatsApp do responsável financeiro inválido ou incompleto'); return;
        }
      }
    }
    onNext();
  }

  const pacienteCpfDigits = onlyDigits(paciente.cpf);

  return (
    <div className="space-y-6">

      {/* ── Selecionar paciente já cadastrado (padrão Step1Provider) ── */}
      {existingPatients.length > 0 && (
        <div
          className="rounded-2xl p-4 border transition-all"
          style={{
            background:   'linear-gradient(135deg, #eef8ff, #f5fbff)',
            borderColor:  '#7db7e8',
            boxShadow:    '0 8px 24px rgba(30, 96, 145, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => setShowPatientSelect(!showPatientSelect)}
            className="flex items-center gap-3 w-full text-left"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2f7fc4, #1e6091)' }}>
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#1e6091' }}>Pacientes cadastrados</p>
              <p className="text-xs text-slate-500">Selecione um paciente já cadastrado para preencher automaticamente os dados abaixo.</p>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${showPatientSelect ? 'rotate-180' : ''}`}
              style={{ color: '#2f7fc4' }} />
          </button>

          {showPatientSelect && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {existingPatients.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyExistingPatient(p)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-all text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-900 truncate">{p.nome_completo}</p>
                    <p className="text-xs text-slate-500">
                      {p.is_menor ? 'Menor de idade' : 'Adulto'}
                      {p.cpf ? ` · CPF: ${p.cpf}` : ''}
                      {p.email ? ` · ${p.email}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="cc-card p-6">
        <div className="section-title">Dados do Paciente</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="cc-label">Nome completo <span className="text-red-500">*</span></label>
            <input type="text" value={paciente.nome_completo}
              onChange={e => updatePaciente('nome_completo', capitalizeName(e.target.value))}
              placeholder="Nome completo do paciente"
              className={clsx('cc-input w-full', !paciente.nome_completo.trim() && 'border-red-300')} />
          </div>

          <div>
            <label className="cc-label">CPF</label>
            <div className="relative">
              <input type="text" maxLength={14} value={maskCPF(paciente.cpf)}
                onChange={e => updatePaciente('cpf', e.target.value)}
                placeholder="000.000.000-00"
                className="cc-input w-full pr-8" />
              <FieldStatus
                valid={pacienteCpfDigits.length === 11 && validateCPF(pacienteCpfDigits)}
                touched={pacienteCpfDigits.length > 0} />
            </div>
            {pacienteCpfDigits.length === 11 && !validateCPF(pacienteCpfDigits) && (
              <p className="text-red-500 text-xs mt-1">CPF inválido.</p>
            )}
          </div>

          <div>
            <label className="cc-label">RG</label>
            <input type="text" value={paciente.rg}
              onChange={e => updatePaciente('rg', maskRG(e.target.value))}
              placeholder="RG" className="cc-input w-full" />
          </div>

          <div>
            <label className="cc-label">Data de nascimento</label>
            <input type="date" value={paciente.data_nascimento}
              max={todayISO()}
              onChange={e => {
                const dob = e.target.value;
                if (!isValidISODateYear(dob)) return;
                if (dob && dob > todayISO()) return;
                onChange({
                  paciente: {
                    ...paciente,
                    data_nascimento: dob,
                    is_menor: dob ? isMenorDeIdade(dob) : paciente.is_menor,
                  },
                });
              }}
              className="cc-input w-full" />
          </div>

          <div>
            <label className="cc-label">WhatsApp</label>
            <div className="relative">
              <input type="text" maxLength={15} value={maskPhone(paciente.telefone)}
                onChange={e => updatePaciente('telefone', e.target.value)}
                placeholder="(00) 00000-0000" className="cc-input w-full pr-8" />
              <FieldStatus
                valid={isValidPhone(paciente.telefone)}
                touched={onlyDigits(paciente.telefone).length > 0} />
            </div>
            {onlyDigits(paciente.telefone).length > 0 && !isValidPhone(paciente.telefone) && (
              <p className="text-red-500 text-xs mt-1">Número incompleto.</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="cc-label">E-mail</label>
            <div className="relative">
              <input type="email" value={paciente.email}
                onChange={e => updatePaciente('email', e.target.value)}
                placeholder="email@exemplo.com" className="cc-input w-full pr-8" />
              <FieldStatus
                valid={isValidEmail(paciente.email)}
                touched={paciente.email.length > 0} />
            </div>
            {paciente.email.length > 0 && !isValidEmail(paciente.email) && (
              <p className="text-red-500 text-xs mt-1">E-mail inválido.</p>
            )}
          </div>
        </div>

        {/* Toggle menor */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={paciente.is_menor}
              onChange={e => updatePaciente('is_menor', e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded" />
            <div>
              <span className="text-sm font-medium text-slate-700">Paciente menor de idade</span>
              <p className="text-2xs text-slate-400 mt-0.5">Exigirá responsável legal para autorizar o atendimento</p>
            </div>
          </label>
        </div>
      </div>

      {/* ── Responsável legal (aparece antes do endereço, quando menor) ── */}
      {paciente.is_menor && (
        <div className="space-y-4">
          <ResponsavelBlock titulo="Responsável Legal" data={responsavel_legal}
            onChange={updateRespLegal} showLegalBadge />

          <div className="cc-card p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={mesmo_responsavel}
                onChange={e => onChange({ mesmo_responsavel: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded" />
              <div>
                <span className="text-sm font-medium text-slate-700">Responsável financeiro é a mesma pessoa</span>
                <p className="text-2xs text-slate-400 mt-0.5">Quem paga é a mesma pessoa que autoriza o atendimento</p>
              </div>
            </label>
          </div>

          {!mesmo_responsavel && (
            <ResponsavelBlock titulo="Responsável Financeiro" data={responsavel_financeiro}
              onChange={updateRespFin} showFinBadge />
          )}
        </div>
      )}

      {/* ── Endereço ── */}
      <div className="cc-card p-6">
        <div className="section-title">Endereço</div>
        <AddressBlock data={paciente} onChange={updatePacienteAddr} />
      </div>

      {/* ── Observação administrativa ── */}
      <div className="cc-card p-6">
        <label className="cc-label">Observação administrativa</label>
        <textarea rows={2}
          value={paciente.observacao_administrativa}
          onChange={e => updatePaciente('observacao_administrativa', e.target.value)}
          placeholder="Ex: prefere atendimento no turno da tarde, contato preferencial via WhatsApp..."
          className="cc-textarea w-full" />
        <p className="text-2xs text-amber-600 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          Não registre diagnóstico, evolução, queixa clínica, conduta, CID, medicação ou informações de prontuário.
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <button type="button" onClick={handleNext}
          className="btn-primary flex items-center gap-2">
          Avançar para Serviço <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
