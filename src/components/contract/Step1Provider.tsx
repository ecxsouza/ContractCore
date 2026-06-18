'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChevronRight, Search, AlertTriangle, Users, ChevronDown } from 'lucide-react';
import type { ServiceProvider, PersonType, ProfessionType } from '@/types';
import {
  maskCPF, maskCNPJ, maskPhone, maskCEP, maskRG, maskIE, maskISS,
  capitalizeName, validateCPF, validateCNPJ, onlyDigits
} from '@/lib/masks';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function useScrollTop() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
}

// Hook para buscar prestadores existentes
function useExistingProviders() {
  const [providers, setProviders] = useState<{ id: string; nome_razao_social: string; profissao: string; tipo_pessoa: string; email: string; telefone: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/providers')
      .then(r => r.ok ? r.json() : { providers: [] })
      .then(d => setProviders(d.providers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { providers, loading };
}

// Máscara genérica para campos numéricos com pontos/traço (RG, IE, ISS)
function maskNumericDoc(value: string, max = 20): string {
  // Remove tudo exceto números e letras (para RG que pode ter X no final)
  return value.replace(/[^0-9A-Za-z.\-\/]/g, '').slice(0, max);
}

// Indicador visual de validação
function FieldStatus({ valid, touched }: { valid: boolean; touched: boolean }) {
  if (!touched) return null;
  return valid
    ? <CheckCircle className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    : <XCircle    className="w-4 h-4 text-red-400    absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />;
}

const PROFISSOES: { value: ProfessionType; label: string; conselho?: string }[] = [
  { value: 'psicologo',      label: 'Psicólogo(a)',      conselho: 'CRP — Conselho Regional de Psicologia' },
  { value: 'neuropsicologo', label: 'Neuropsicólogo(a)', conselho: 'CRP — Conselho Regional de Psicologia' },
  { value: 'fonoaudiologo',  label: 'Fonoaudiólogo(a)',  conselho: 'CFFa — Conselho Regional de Fonoaudiologia' },
  { value: 'psicopedagogo',  label: 'Psicopedagogo(a)',  conselho: '' },
  { value: 'secretaria',     label: 'Secretária',        conselho: '' },
  { value: 'recepcionista',  label: 'Recepcionista',     conselho: '' },
  { value: 'coordenador',    label: 'Coordenador(a)',    conselho: '' },
  { value: 'outro',          label: 'Outro',             conselho: '' },
];

const PESSOA_TYPES: { value: PersonType; label: string; desc: string }[] = [
  { value: 'PJ',  label: 'PJ',  desc: 'Pessoa Jurídica' },
  { value: 'MEI', label: 'MEI', desc: 'Microempreendedor Individual' },
  { value: 'PF',  label: 'PF',  desc: 'Pessoa Física Autônoma' },
];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

interface Step1Props {
  data: Omit<ServiceProvider, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
  onChange: (data: any) => void;
  onNext: () => void;
}

export function Step1Provider({ data, onChange, onNext }: Step1Props) {
  useScrollTop();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [loadingCEP,  setLoadingCEP]  = useState(false);

  function touch(field: string) {
    setTouched(p => ({ ...p, [field]: true }));
  }

  function isValidEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  function handleProfissaoChange(profissao: ProfessionType) {
    const prof = PROFISSOES.find(p => p.value === profissao);
    onChange({ profissao, conselho_profissional: prof?.conselho || '' });
  }

  async function buscarCNPJ() {
    const cnpj = onlyDigits(data.cnpj || '');
    if (cnpj.length !== 14) { toast.error('Digite o CNPJ completo (14 dígitos).'); return; }
    if (!validateCNPJ(cnpj)) { toast.error('CNPJ inválido — verifique os números.'); return; }
    setLoadingCNPJ(true);
    try {
      const res = await fetch(`/api/cnpj?cnpj=${cnpj}`);
      if (!res.ok) { toast.error('CNPJ não encontrado na Receita Federal.'); return; }
      const d = await res.json();
      onChange({
        nome_razao_social: d.razao_social,
        nome_fantasia: d.nome_fantasia || '',
        logradouro: d.logradouro, numero: d.numero,
        complemento: d.complemento || '', bairro: d.bairro,
        cidade: d.municipio, uf: d.uf, cep: d.cep,
        email: d.email || '', telefone: d.telefone || '',
      });
      toast.success('Dados preenchidos via CNPJ!');
    } catch { toast.error('Erro ao consultar CNPJ. Preencha manualmente.'); }
    finally { setLoadingCNPJ(false); }
  }

  async function buscarCEP() {
    const cep = onlyDigits(data.cep || '');
    if (cep.length !== 8) return;
    setLoadingCEP(true);
    try {
      const res = await fetch(`/api/cep?cep=${cep}`);
      if (!res.ok) return;
      const d = await res.json();
      onChange({ logradouro: d.logradouro, complemento: d.complemento || '', bairro: d.bairro, cidade: d.localidade, uf: d.uf });
    } finally { setLoadingCEP(false); }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!data.tipo_pessoa)              e.tipo_pessoa        = 'Selecione o tipo de vínculo.';
    if (!data.nome_razao_social.trim()) e.nome_razao_social  = 'Nome/razão social obrigatório.';
    if (!data.profissao)                e.profissao          = 'Selecione a profissão.';
    if (!data.email.trim())             e.email              = 'E-mail obrigatório.';
    if (!isValidEmail(data.email))      e.email              = 'E-mail inválido.';
    if (!(data as any).celular?.trim()) e.celular            = 'Celular/WhatsApp obrigatório.';
    if (!data.cep.trim())               e.cep                = 'CEP obrigatório.';
    if (!data.logradouro.trim())        e.logradouro         = 'Logradouro obrigatório.';
    if (!data.cidade.trim())            e.cidade             = 'Cidade obrigatória.';
    if (data.tipo_pessoa === 'PF' && data.cpf && !validateCPF(data.cpf))
      e.cpf = 'CPF inválido.';
    if ((data.tipo_pessoa === 'PJ' || data.tipo_pessoa === 'MEI') && data.cnpj && !validateCNPJ(data.cnpj))
      e.cnpj = 'CNPJ inválido.';
    setErrors(e);
    // Marcar todos como touched ao tentar avançar
    const allFields = Object.keys(e);
    setTouched(p => ({ ...p, ...Object.fromEntries(allFields.map(k => [k, true])) }));
    if (Object.keys(e).length > 0) { toast.error('Corrija os campos destacados.'); return false; }
    return true;
  }

  const isPJ = data.tipo_pessoa === 'PJ' || data.tipo_pessoa === 'MEI';

  // ── Prestadores existentes ────────────────────────────────────
  const { providers: existingProviders } = useExistingProviders();
  const [showProviderSelect, setShowProviderSelect] = useState(false);

  function applyExistingProvider(provider: typeof existingProviders[number]) {
    // Preencher TODOS os campos disponíveis do prestador
    onChange({
      tipo_pessoa:                (provider as any).tipo_pessoa          || data.tipo_pessoa,
      nome_razao_social:          (provider as any).nome_razao_social    || '',
      nome_fantasia:              (provider as any).nome_fantasia        || '',
      cpf:                        (provider as any).cpf                  || '',
      cnpj:                       (provider as any).cnpj                 || '',
      rg:                         (provider as any).rg                   || '',
      profissao:                  (provider as any).profissao            || data.profissao,
      profissao_descricao:        (provider as any).profissao_descricao || '',
      especialidade:              (provider as any).especialidade        || '',
      conselho_profissional:      (provider as any).conselho_profissional      || '',
      numero_registro_conselho:   (provider as any).numero_registro_conselho   || '',
      cep:                        (provider as any).cep                  || '',
      logradouro:                 (provider as any).logradouro           || '',
      numero:                     (provider as any).numero               || '',
      complemento:                (provider as any).complemento          || '',
      bairro:                     (provider as any).bairro               || '',
      cidade:                     (provider as any).cidade               || '',
      uf:                         (provider as any).uf                   || '',
      email:                      (provider as any).email                || '',
      telefone:                   (provider as any).telefone             || '',
      celular:                    (provider as any).celular              || '',
      telefone_fixo:              (provider as any).telefone_fixo        || '',
      responsavel_legal:          (provider as any).responsavel_legal    || '',
      cpf_responsavel:            (provider as any).cpf_responsavel      || '',
      estado_civil:               (provider as any).estado_civil         || '',
      nacionalidade:              (provider as any).nacionalidade        || '',
      inscricao_estadual:         (provider as any).inscricao_estadual   || '',
      inscricao_municipal:        (provider as any).inscricao_municipal  || '',
    });
    setShowProviderSelect(false);
    toast.success(`Dados completos de ${(provider as any).nome_razao_social} carregados!`);
  }

  return (
    <div className="space-y-6 animate-in">

      {/* Atalho: usar prestador já cadastrado */}
      {existingProviders.length > 0 && (
        <div className="cc-card p-4 border-brand-200 bg-brand-50/30">
          <button
            type="button"
            onClick={() => setShowProviderSelect(!showProviderSelect)}
            className="flex items-center gap-3 w-full text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-brand-900">Usar prestador já cadastrado</p>
              <p className="text-xs text-slate-500">Carrega os dados de um profissional existente</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-brand-400 transition-transform ${showProviderSelect ? 'rotate-180' : ''}`} />
          </button>
          {showProviderSelect && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {existingProviders.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyExistingProvider(p)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-all text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-900 truncate">{p.nome_razao_social}</p>
                    <p className="text-xs text-slate-500">{p.profissao} · {p.tipo_pessoa} · {p.email}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tipo de Pessoa */}
      <div className="cc-card p-6">
        <div className="section-title">Tipo de Vínculo Jurídico</div>
        <div className="grid grid-cols-3 gap-3">
          {PESSOA_TYPES.map(tp => (
            <button key={tp.value} type="button" onClick={() => onChange({ tipo_pessoa: tp.value })}
              className={clsx('flex flex-col items-center gap-1 p-4 rounded-xl border-2 text-center transition-all',
                data.tipo_pessoa === tp.value
                  ? 'border-brand-500 bg-brand-50 text-brand-800'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-200')}>
              <span className="text-lg font-bold">{tp.label}</span>
              <span className="text-xs opacity-70">{tp.desc}</span>
            </button>
          ))}
        </div>
        {errors.tipo_pessoa && <p className="text-red-500 text-xs mt-2">{errors.tipo_pessoa}</p>}
        {data.tipo_pessoa === 'PF' && (
          <div className="mt-4 flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <span><strong>Atenção (Departamento Pessoal):</strong> PF autônomo exige cuidado especial para não caracterizar vínculo empregatício. Verifique exclusividade e autonomia real do prestador.</span>
          </div>
        )}
      </div>

      {/* Identificação */}
      <div className="cc-card p-6">
        <div className="section-title">Identificação</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* CNPJ — primeiro campo para PJ/MEI, preenche os demais automaticamente */}
          {isPJ && (
            <div className="md:col-span-2">
              <label className="cc-label">CNPJ</label>
              <p className="text-2xs text-slate-400 mb-1.5">Preencha e clique em 🔍 para consultar e preencher os dados automaticamente.</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input className={clsx('cc-input pr-8', errors.cnpj && 'error')}
                    value={data.cnpj || ''}
                    onChange={e => { onChange({ cnpj: maskCNPJ(e.target.value) }); touch('cnpj'); }}
                    placeholder="00.000.000/0000-00" maxLength={18} />
                  <FieldStatus valid={validateCNPJ(onlyDigits(data.cnpj || ''))} touched={!!touched.cnpj && !!data.cnpj} />
                </div>
                <button type="button" onClick={buscarCNPJ} disabled={loadingCNPJ}
                  className="btn-primary px-4 flex-shrink-0 gap-2">
                  {loadingCNPJ
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Search className="w-4 h-4" />}
                  {loadingCNPJ ? 'Buscando...' : 'Consultar'}
                </button>
              </div>
              {errors.cnpj && <p className="text-red-500 text-xs mt-1">{errors.cnpj}</p>}
            </div>
          )}

          {/* Nome / Razão Social */}
          <div className="md:col-span-2">
            <label className="cc-label">Nome Completo / Razão Social <span className="text-red-500">*</span></label>
            <div className="relative">
              <input className={clsx('cc-input pr-8', errors.nome_razao_social && 'error')}
                value={data.nome_razao_social}
                onChange={e => { onChange({ nome_razao_social: capitalizeName(e.target.value) }); touch('nome_razao_social'); }}
                placeholder="Ex: João da Silva Serviços Psicológicos Ltda" />
              <FieldStatus valid={!!data.nome_razao_social.trim()} touched={!!touched.nome_razao_social} />
            </div>
            {errors.nome_razao_social && <p className="text-red-500 text-xs mt-1">{errors.nome_razao_social}</p>}
          </div>

          {/* Nome Fantasia (PJ/MEI) */}
          {isPJ && (
            <div>
              <label className="cc-label">Nome Fantasia</label>
              <input className="cc-input" value={data.nome_fantasia || ''}
                onChange={e => onChange({ nome_fantasia: e.target.value })} placeholder="Ex: Psicologia Silva" />
            </div>
          )}

          {/* CPF */}
          <div>
            <label className="cc-label">
              CPF {data.tipo_pessoa === 'PF' ? <span className="text-red-500">*</span> : <span className="text-slate-400 normal-case font-normal">(responsável PJ)</span>}
            </label>
            <div className="relative">
              <input className={clsx('cc-input pr-8', errors.cpf && 'error')}
                value={data.cpf || ''}
                onChange={e => { onChange({ cpf: maskCPF(e.target.value) }); touch('cpf'); }}
                placeholder="000.000.000-00" maxLength={14} />
              <FieldStatus valid={validateCPF(onlyDigits(data.cpf || ''))} touched={!!touched.cpf && !!data.cpf} />
            </div>
            {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
          </div>

          {/* RG — aceita letras no último dígito */}
          <div>
			  <label className="cc-label">
				RG{' '}
				{data.tipo_pessoa !== 'PF' && (
				  <span className="text-slate-400 normal-case font-normal">
					(responsável PJ)
				  </span>
				)}
			  </label>
            <input className="cc-input"
              value={data.rg || ''}
              onChange={e => onChange({ rg: maskRG(e.target.value) })}
              placeholder="Ex: 12.345.678-X" maxLength={12} />
          </div>

          {/* Inscrição Municipal */}
          {data.tipo_pessoa !== 'PF' && (
          <div>
            <label className="cc-label">Inscrição Municipal (ISS / CCM)</label>
            <input className="cc-input"
              value={data.inscricao_municipal || ''}
              onChange={e => onChange({ inscricao_municipal: maskISS(e.target.value) })}
              placeholder="Ex: 000.000/000-0" maxLength={16} />
          </div>
          )}

          {/* Responsável Legal (PJ) */}
          {data.tipo_pessoa === 'PJ' && (
            <div className="md:col-span-2">
              <label className="cc-label">Responsável Legal pela PJ</label>
              <input className="cc-input"
                value={data.responsavel_legal || ''}
                onChange={e => onChange({ responsavel_legal: capitalizeName(e.target.value) })}
                placeholder="Nome completo do sócio ou diretor responsável" />
            </div>
          )}

          {/* Estado Civil e Nacionalidade (PF) */}
          {data.tipo_pessoa === 'PF' && (<>
            <div>
              <label className="cc-label">Nacionalidade</label>
              <input className="cc-input" value={data.nacionalidade || ''}
                onChange={e => onChange({ nacionalidade: e.target.value })} placeholder="Brasileira" />
            </div>
            <div>
              <label className="cc-label">Estado Civil</label>
              <select className="cc-select" value={data.estado_civil || ''}
                onChange={e => onChange({ estado_civil: e.target.value })}>
                <option value="">— Selecione —</option>
                {['Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)','União Estável'].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </>)}
        </div>
      </div>

      {/* Dados Profissionais */}
      <div className="cc-card p-6">
        <div className="section-title">Dados Profissionais</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="cc-label">Profissão / Função <span className="text-red-500">*</span></label>
            <select className={clsx('cc-select', errors.profissao && 'error')}
              value={data.profissao} onChange={e => handleProfissaoChange(e.target.value as ProfessionType)}>
              <option value="">— Selecione —</option>
              {PROFISSOES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            {errors.profissao && <p className="text-red-500 text-xs mt-1">{errors.profissao}</p>}
          </div>

          {data.profissao === 'outro' && (
            <div>
              <label className="cc-label">Qual é a profissão/função? <span className="text-red-500">*</span></label>
              <input className="cc-input" value={data.profissao_descricao || ''}
                onChange={e => onChange({ profissao_descricao: e.target.value })}
                placeholder="Ex: Terapeuta Ocupacional, Musicoterapeuta..." />
            </div>
          )}

          <div>
            <label className="cc-label">Especialidade</label>
            <input className="cc-input" value={data.especialidade || ''}
              onChange={e => onChange({ especialidade: e.target.value })}
              placeholder="Ex: Neuropsicologia Clínica, ABA, Avaliação Psicológica" />
          </div>

          <div>
            <label className="cc-label">Conselho Profissional</label>
            <input className="cc-input" value={data.conselho_profissional || ''}
              onChange={e => onChange({ conselho_profissional: e.target.value })}
              placeholder="Ex: CRP — Conselho Regional de Psicologia" />
          </div>

          <div>
            <label className="cc-label">Nº de Registro no Conselho</label>
            <input className="cc-input"
              value={data.numero_registro_conselho || ''}
              onChange={e => onChange({ numero_registro_conselho: maskNumericDoc(e.target.value, 20) })}
              placeholder="Ex: 06/000000" maxLength={20} />
          </div>
        </div>
      </div>

      {/* Contato — Telefone Fixo + Celular separados */}
      <div className="cc-card p-6">
        <div className="section-title">Contato</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="md:col-span-2">
            <label className="cc-label">E-mail <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type="email" className={clsx('cc-input pr-8', errors.email && 'error')}
                value={data.email}
                onChange={e => { onChange({ email: e.target.value.toLowerCase() }); touch('email'); }}
                placeholder="email@exemplo.com.br" />
              <FieldStatus valid={isValidEmail(data.email)} touched={!!touched.email && !!data.email} />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Celular (obrigatório) */}
          <div>
            <label className="cc-label">Celular / WhatsApp <span className="text-red-500">*</span></label>
            <div className="relative">
              <input className={clsx('cc-input pr-8', errors.celular && 'error')}
                value={(data as any).celular || ''}
                onChange={e => { onChange({ celular: maskPhone(e.target.value), telefone: maskPhone(e.target.value) }); touch('celular'); }}
                placeholder="(11) 99999-0000" maxLength={15} />
              <FieldStatus
                valid={onlyDigits((data as any).celular || '').length >= 10}
                touched={!!touched.celular && !!(data as any).celular} />
            </div>
            {errors.celular && <p className="text-red-500 text-xs mt-1">{errors.celular}</p>}
          </div>

          {/* Telefone Fixo (opcional) */}
          <div>
            <label className="cc-label">Telefone Fixo <span className="text-slate-400 normal-case font-normal">(opcional)</span></label>
            <div className="relative">
              <input className="cc-input pr-8"
                value={(data as any).telefone_fixo || ''}
                onChange={e => onChange({ telefone_fixo: maskPhone(e.target.value) })}
                placeholder="(11) 3000-0000" maxLength={14} />
              <FieldStatus
                valid={onlyDigits((data as any).telefone_fixo || '').length >= 10}
                touched={!!(data as any).telefone_fixo} />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="section-title mt-6">Endereço</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="cc-label">CEP <span className="text-red-500">*</span></label>
            <div className="flex gap-2 items-center">
              <input className={clsx('cc-input flex-1', errors.cep && 'error')}
                value={data.cep}
                onChange={e => { onChange({ cep: maskCEP(e.target.value) }); touch('cep'); }}
                onBlur={buscarCEP}
                placeholder="00000-000" maxLength={9} />
              {loadingCEP && <span className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin flex-shrink-0" />}
            </div>
            {errors.cep && <p className="text-red-500 text-xs mt-1">{errors.cep}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="cc-label">Logradouro <span className="text-red-500">*</span></label>
            <input className={clsx('cc-input', errors.logradouro && 'error')}
              value={data.logradouro}
              onChange={e => { onChange({ logradouro: e.target.value }); touch('logradouro'); }}
              placeholder="Rua, Avenida, Travessa..." />
          </div>

          <div>
            <label className="cc-label">Número</label>
            <input className="cc-input" value={data.numero}
              onChange={e => onChange({ numero: e.target.value })} placeholder="000" />
          </div>
          <div>
            <label className="cc-label">Complemento</label>
            <input className="cc-input" value={data.complemento || ''}
              onChange={e => onChange({ complemento: e.target.value })} placeholder="Apto, Sala..." />
          </div>
          <div>
            <label className="cc-label">Bairro</label>
            <input className="cc-input" value={data.bairro}
              onChange={e => onChange({ bairro: e.target.value })} placeholder="Bairro" />
          </div>
          <div>
            <label className="cc-label">Cidade <span className="text-red-500">*</span></label>
            <input className={clsx('cc-input', errors.cidade && 'error')}
              value={data.cidade}
              onChange={e => { onChange({ cidade: e.target.value }); touch('cidade'); }}
              placeholder="São Paulo" />
            {errors.cidade && <p className="text-red-500 text-xs mt-1">{errors.cidade}</p>}
          </div>
          <div>
            <label className="cc-label">UF</label>
            <select className="cc-select" value={data.uf} onChange={e => onChange({ uf: e.target.value })}>
              <option value="">UF</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>

        {/* Inscrição Estadual — fica após UF para aplicar máscara correta */}
        {data.tipo_pessoa === 'PJ' && (
          <div className="mt-3">
            <label className="cc-label">Inscrição Estadual (IE)</label>
            <input className="cc-input"
              value={(data as any).inscricao_estadual || ''}
              onChange={e => onChange({ inscricao_estadual: maskIE(e.target.value, data.uf || '') })}
              placeholder={
                data.uf === 'SP' ? '000.000.000.000' :
                data.uf === 'RJ' ? '00.000.00-0' :
                data.uf === 'MG' ? '000.000.000/0000' :
                data.uf === 'RS' ? '000-0000000' :
                data.uf === 'PR' ? '00000000-00' :
                data.uf ? `IE para ${data.uf}` : 'Selecione o UF primeiro'
              }
              disabled={!data.uf}
              maxLength={20} />
            {data.uf
              ? <p className="text-2xs text-slate-400 mt-1">✓ Formato para <strong>{data.uf}</strong> aplicado automaticamente.</p>
              : <p className="text-2xs text-amber-500 mt-1">Selecione o UF acima para habilitar a máscara correta.</p>
            }
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => validate() && onNext()} className="btn-primary">
          Próxima etapa <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
