'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Check, Loader2, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { capitalizeName, maskCPF, maskCNPJ, maskPhone, maskCEP, maskRG } from '@/lib/masks';

const PROFISSOES = [
  { value: 'psicologo',      label: 'Psicólogo(a)'      },
  { value: 'neuropsicologo', label: 'Neuropsicólogo(a)' },
  { value: 'fonoaudiologo',  label: 'Fonoaudiólogo(a)'  },
  { value: 'psicopedagogo',  label: 'Psicopedagogo(a)'  },
  { value: 'secretaria',     label: 'Secretária'         },
  { value: 'recepcionista',  label: 'Recepcionista'      },
  { value: 'coordenador',    label: 'Coordenador(a)'     },
  { value: 'outro',          label: 'Outro'              },
];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function NewProviderButton() {
  const router   = useRouter();
  const supabase = createClient();
  const [show,   setShow]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo_pessoa: 'PJ' as 'PJ' | 'MEI' | 'PF',
    nome_razao_social: '', nome_fantasia: '',
    cpf: '', cnpj: '', rg: '',
    profissao: 'psicologo', profissao_descricao: '', especialidade: '',
    conselho_profissional: '', numero_registro_conselho: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: 'SP',
    email: '', telefone: '', celular: '', telefone_fixo: '',
    responsavel_legal: '', cpf_responsavel: '',
    estado_civil: '', nacionalidade: 'Brasileira',
    inscricao_municipal: '', inscricao_estadual: '',
  });

  function upd(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    if (!form.nome_razao_social.trim()) { toast.error('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      // Buscar company_id do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { data: company } = await supabase
        .from('companies').select('id').eq('user_id', user.id).single();
      if (!company) throw new Error('Empresa não encontrada');

      const { error } = await supabase.from('service_providers').insert({
        ...form,
        company_id: company.id,
        telefone: form.celular || form.telefone_fixo || '',
      });
      if (error) throw error;
      toast.success('Prestador cadastrado!');
      setShow(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  const isPJ = form.tipo_pessoa === 'PJ' || form.tipo_pessoa === 'MEI';

  return (
    <>
      <button onClick={() => setShow(true)} className="btn-primary">
        <Plus className="w-4 h-4" /> Incluir Prestador
      </button>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-card-lg max-w-2xl w-full max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-slate-100">
              <h3 className="font-bold text-brand-900 text-lg">Incluir Novo Prestador</h3>
              <button onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">

              {/* Tipo */}
              <div>
                <p className="section-title mb-3">Tipo de Vínculo</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['PJ', 'MEI', 'PF'] as const).map(t => (
                    <button key={t} type="button" onClick={() => upd('tipo_pessoa', t)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.tipo_pessoa === t ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600'}`}>
                      {t === 'PJ' ? '🏢 PJ' : t === 'MEI' ? '🪪 MEI' : '👤 PF'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Identificação */}
              <div>
                <p className="section-title mb-3">Identificação</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="cc-label">Nome / Razão Social *</label>
                    <input className="cc-input" value={form.nome_razao_social}
                      onChange={e => upd('nome_razao_social', capitalizeName(e.target.value))} />
                  </div>
                  {form.tipo_pessoa === 'PF'
                    ? <div><label className="cc-label">CPF</label>
                        <input className="cc-input" value={form.cpf}
                          onChange={e => upd('cpf', maskCPF(e.target.value))} maxLength={14} /></div>
                    : <div><label className="cc-label">CNPJ</label>
                        <input className="cc-input" value={form.cnpj}
                          onChange={e => upd('cnpj', maskCNPJ(e.target.value))} maxLength={18} /></div>
                  }
                  <div>
                    <label className="cc-label">{isPJ ? 'RG (responsável)' : 'RG'}</label>
                    <input className="cc-input" value={form.rg}
                      onChange={e => upd('rg', maskRG(e.target.value))} maxLength={12} />
                  </div>
                </div>
              </div>

              {/* Profissão */}
              <div>
                <p className="section-title mb-3">Profissão</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="cc-label">Profissão *</label>
                    <select className="cc-select" value={form.profissao}
                      onChange={e => upd('profissao', e.target.value)}>
                      {PROFISSOES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="cc-label">Especialidade</label>
                    <input className="cc-input" value={form.especialidade}
                      onChange={e => upd('especialidade', e.target.value)} />
                  </div>
                  <div>
                    <label className="cc-label">Conselho</label>
                    <input className="cc-input" value={form.conselho_profissional}
                      onChange={e => upd('conselho_profissional', e.target.value)} placeholder="Ex: CRP" />
                  </div>
                  <div>
                    <label className="cc-label">Nº Registro</label>
                    <input className="cc-input" value={form.numero_registro_conselho}
                      onChange={e => upd('numero_registro_conselho', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div>
                <p className="section-title mb-3">Contato</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="cc-label">E-mail</label>
                    <input type="email" className="cc-input" value={form.email}
                      onChange={e => upd('email', e.target.value)} />
                  </div>
                  <div>
                    <label className="cc-label">Celular</label>
                    <input className="cc-input" value={form.celular}
                      onChange={e => upd('celular', maskPhone(e.target.value))} maxLength={16} />
                  </div>
                  <div>
                    <label className="cc-label">Telefone Fixo</label>
                    <input className="cc-input" value={form.telefone_fixo}
                      onChange={e => upd('telefone_fixo', maskPhone(e.target.value))} maxLength={15} />
                  </div>
                  <div>
                    <label className="cc-label">CEP</label>
                    <input className="cc-input" value={form.cep}
                      onChange={e => upd('cep', maskCEP(e.target.value))} maxLength={9} />
                  </div>
                  <div>
                    <label className="cc-label">Cidade</label>
                    <input className="cc-input" value={form.cidade}
                      onChange={e => upd('cidade', e.target.value)} />
                  </div>
                  <div>
                    <label className="cc-label">UF</label>
                    <select className="cc-select" value={form.uf}
                      onChange={e => upd('uf', e.target.value)}>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex gap-3 px-8 py-6 border-t border-slate-100">
              <button onClick={() => setShow(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : <><Check className="w-4 h-4" /> Cadastrar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
