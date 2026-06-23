'use client';

// ================================================================
// Step 1 — Paciente e Responsáveis
// NÃO inclui campos clínicos (diagnóstico, CID, evolução, etc.)
// Campo livre: somente observacao_administrativa (administrativo)
// ================================================================

import { useEffect } from 'react';
import { ChevronRight, User, Users, AlertTriangle } from 'lucide-react';
import type {
  PatientTermFormData,
  PatientTermFormPaciente,
  PatientTermFormResponsavel,
  PatientResponsibleKinship,
} from '@/lib/patientTerms/types';
import { maskCPF, maskPhone, maskCEP, maskRG, capitalizeName } from '@/lib/masks';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function useScrollTop() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
}

// Calcula se uma data ISO (YYYY-MM-DD) corresponde a menor de 18 anos.
// Não usa new Date(dateStr) para evitar deslocamento de fuso horário.
function isMenorDeIdade(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return false;

  const today        = new Date();
  let   age          = today.getFullYear() - year;
  const currentMonth = today.getMonth() + 1;
  const currentDay   = today.getDate();

  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age--;
  }
  return age < 18;
}

// Data máxima = hoje (sem datas futuras para nascimento)
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Valida que o ano tem exatamente 4 dígitos — evita anos com 5+ dígitos
// que alguns navegadores permitem digitar mesmo com max= definido.
function isValidISODateYear(value: string): boolean {
  if (!value) return true;
  const [year] = value.split('-');
  return /^\d{4}$/.test(year);
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

// Busca CEP via ViaCEP — mesmo padrão do Step1Provider
async function fetchCEP(cep: string) {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const r = await fetch(`/api/cep?cep=${digits}`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// ── Bloco de endereço reutilizável ────────────────────────────────
// onChange aceita Partial para permitir atualização atômica de vários campos
// de uma vez (especialmente ao preencher via CEP), evitando perda de dados
// por múltiplas chamadas sobre o mesmo snapshot de estado.
type AddressData = Pick<PatientTermFormPaciente,
  'cep' | 'logradouro' | 'numero' | 'complemento' | 'bairro' | 'cidade' | 'uf'>;

interface AddressBlockProps {
  data:     AddressData;
  onChange: (updates: Partial<AddressData>) => void;
}

function AddressBlock({ data, onChange }: AddressBlockProps) {
  async function handleCepBlur() {
    const r = await fetchCEP(data.cep);
    if (r?.logradouro) {
      // Atualização atômica: todos os campos do CEP em uma única chamada
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
        <input
          type="text" maxLength={9}
          value={maskCEP(data.cep)}
          onChange={e => onChange({ cep: e.target.value })}
          onBlur={handleCepBlur}
          placeholder="00000-000"
          className="cc-input w-full"
        />
      </div>
      <div>
        <label className="cc-label">Logradouro</label>
        <input type="text" value={data.logradouro}
          onChange={e => onChange({ logradouro: e.target.value })}
          placeholder="Rua, Avenida..."
          className="cc-input w-full" />
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

// ── Bloco do responsável ──────────────────────────────────────────
interface ResponsavelBlockProps {
  titulo:  string;
  data:    PatientTermFormResponsavel;
  onChange: (field: keyof PatientTermFormResponsavel, value: string | boolean) => void;
  showLegalBadge?: boolean;
  showFinBadge?:   boolean;
  required?: boolean;
}

function ResponsavelBlock({ titulo, data, onChange, showLegalBadge, showFinBadge, required }: ResponsavelBlockProps) {
  const faltaNome = required && !data.nome_completo.trim();
  const faltaCPF  = required && !data.cpf.trim();

  return (
    <div className="cc-card p-5 border-brand-100 bg-blue-50/30">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-brand-600 flex-shrink-0" />
        <h3 className="font-semibold text-sm text-brand-900">{titulo}</h3>
        {showLegalBadge && (
          <span className="text-2xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">Autoriza atendimento</span>
        )}
        {showFinBadge && (
          <span className="text-2xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Responsável financeiro</span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="cc-label">
            Nome completo {required && <span className="text-red-500">*</span>}
          </label>
          <input type="text" value={data.nome_completo}
            onChange={e => onChange('nome_completo', capitalizeName(e.target.value))}
            placeholder="Nome do responsável"
            className={clsx('cc-input w-full', faltaNome && 'border-red-300')} />
        </div>
        <div>
          <label className="cc-label">
            CPF {required && <span className="text-red-500">*</span>}
          </label>
          <input type="text" maxLength={14} value={maskCPF(data.cpf)}
            onChange={e => onChange('cpf', e.target.value)}
            placeholder="000.000.000-00"
            className={clsx('cc-input w-full', faltaCPF && 'border-red-300')} />
        </div>
        <div>
          <label className="cc-label">RG</label>
          <input type="text" value={data.rg}
            onChange={e => onChange('rg', maskRG(e.target.value))}
            placeholder="RG" className="cc-input w-full" />
        </div>
        <div>
          <label className="cc-label">WhatsApp</label>
          <input type="text" maxLength={15} value={maskPhone(data.telefone)}
            onChange={e => onChange('telefone', e.target.value)}
            placeholder="(00) 00000-0000" className="cc-input w-full" />
        </div>
        <div>
          <label className="cc-label">E-mail</label>
          <input type="email" value={data.email}
            onChange={e => onChange('email', e.target.value)}
            placeholder="email@exemplo.com" className="cc-input w-full" />
        </div>
        <div className="sm:col-span-2">
          <label className="cc-label">Grau de parentesco</label>
          <select value={data.grau_parentesco}
            onChange={e => onChange('grau_parentesco', e.target.value)}
            className="cc-input w-full">
            <option value="">Selecione...</option>
            {GRAUS_PARENTESCO.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
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

  const { paciente, responsavel_legal, responsavel_financeiro, mesmo_responsavel } = data;

  function updatePaciente(field: keyof PatientTermFormPaciente, value: string | boolean) {
    onChange({ paciente: { ...paciente, [field]: value } });
  }

  function updateRespLegal(field: keyof PatientTermFormResponsavel, value: string | boolean) {
    onChange({ responsavel_legal: { ...responsavel_legal, [field]: value } });
  }

  function updateRespFin(field: keyof PatientTermFormResponsavel, value: string | boolean) {
    onChange({ responsavel_financeiro: { ...responsavel_financeiro, [field]: value } });
  }

  // Merge atômico de campos de endereço — aceita Partial para CEP preencher
  // logradouro + bairro + cidade + uf em uma única chamada de estado.
  function updatePacienteAddr(updates: Partial<PatientTermFormPaciente>) {
    onChange({ paciente: { ...paciente, ...updates } });
  }

  function handleNext() {
    if (!paciente.nome_completo.trim()) {
      toast.error('Nome completo do paciente é obrigatório'); return;
    }
    if (paciente.is_menor) {
      if (!responsavel_legal.nome_completo.trim()) {
        toast.error('Nome do responsável legal é obrigatório para menor de idade'); return;
      }
      if (!responsavel_legal.cpf.trim()) {
        toast.error('CPF do responsável legal é obrigatório para menor de idade'); return;
      }
      if (!mesmo_responsavel) {
        if (!responsavel_financeiro.nome_completo.trim()) {
          toast.error('Nome do responsável financeiro é obrigatório'); return;
        }
        if (!responsavel_financeiro.cpf.trim()) {
          toast.error('CPF do responsável financeiro é obrigatório'); return;
        }
      }
    }
    onNext();
  }

  return (
    <div className="space-y-6">
      {/* ── Dados do paciente ── */}
      <div className="cc-card p-6">
        <div className="section-title">Dados do Paciente</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="cc-label">Nome completo <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={paciente.nome_completo}
              onChange={e => updatePaciente('nome_completo', capitalizeName(e.target.value))}
              placeholder="Nome completo do paciente"
              className={clsx('cc-input w-full', !paciente.nome_completo.trim() && 'border-red-300')}
            />
          </div>

          <div>
            <label className="cc-label">CPF</label>
            <input type="text" maxLength={14}
              value={maskCPF(paciente.cpf)}
              onChange={e => updatePaciente('cpf', e.target.value)}
              placeholder="000.000.000-00"
              className="cc-input w-full" />
          </div>

          <div>
            <label className="cc-label">RG</label>
            <input type="text"
              value={paciente.rg}
              onChange={e => updatePaciente('rg', maskRG(e.target.value))}
              placeholder="RG"
              className="cc-input w-full" />
          </div>

          <div>
            <label className="cc-label">Data de nascimento</label>
            <input type="date"
              value={paciente.data_nascimento}
              max={todayISO()}
              onChange={e => {
                const dob = e.target.value;
                // Bloquear ano com mais de 4 dígitos (alguns browsers permitem)
                if (!isValidISODateYear(dob)) return;
                // Bloquear data futura
                if (dob && dob > todayISO()) return;
                // Atualização atômica: data e is_menor no mesmo snapshot
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
            <input type="text" maxLength={15}
              value={maskPhone(paciente.telefone)}
              onChange={e => updatePaciente('telefone', e.target.value)}
              placeholder="(00) 00000-0000"
              className="cc-input w-full" />
          </div>

          <div className="md:col-span-2">
            <label className="cc-label">E-mail</label>
            <input type="email"
              value={paciente.email}
              onChange={e => updatePaciente('email', e.target.value)}
              placeholder="email@exemplo.com"
              className="cc-input w-full" />
          </div>
        </div>

        {/* Toggle menor de idade */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox"
              checked={paciente.is_menor}
              onChange={e => updatePaciente('is_menor', e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded" />
            <div>
              <span className="text-sm font-medium text-slate-700">Paciente menor de idade</span>
              <p className="text-2xs text-slate-400 mt-0.5">Exigirá responsável legal para autorizar o atendimento</p>
            </div>
          </label>
        </div>

        {/* Endereço */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Endereço</p>
          <AddressBlock data={paciente} onChange={updatePacienteAddr} />
        </div>

        {/* Observação administrativa */}
        <div className="mt-5 pt-4 border-t border-slate-100">
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
      </div>

      {/* ── Responsável legal (somente para menor) ── */}
      {paciente.is_menor && (
        <div className="space-y-4">
          <ResponsavelBlock
            titulo="Responsável Legal"
            data={responsavel_legal}
            onChange={updateRespLegal}
            showLegalBadge
            required
          />

          {/* Mesmo responsável financeiro? */}
          <div className="cc-card p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox"
                checked={mesmo_responsavel}
                onChange={e => onChange({ mesmo_responsavel: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded" />
              <div>
                <span className="text-sm font-medium text-slate-700">Responsável financeiro é a mesma pessoa</span>
                <p className="text-2xs text-slate-400 mt-0.5">Quem paga é a mesma pessoa que autoriza o atendimento</p>
              </div>
            </label>
          </div>

          {!mesmo_responsavel && (
            <ResponsavelBlock
              titulo="Responsável Financeiro"
              data={responsavel_financeiro}
              onChange={updateRespFin}
              showFinBadge
              required
            />
          )}
        </div>
      )}

      {/* ── Botão avançar ── */}
      <div className="flex justify-end pt-2">
        <button type="button" onClick={handleNext}
          className="btn-primary flex items-center gap-2">
          Avançar para Serviço
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
