'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, X, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { capitalizeName, maskCPF, maskCNPJ, maskPhone, maskCEP, maskRG, maskIE, maskISS } from '@/lib/masks';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

interface Provider {
  id:                        string;
  tipo_pessoa:               string;
  nome_razao_social:         string;
  nome_fantasia?:            string;
  cpf?:                      string;
  cnpj?:                     string;
  rg?:                       string;
  inscricao_municipal?:      string;
  inscricao_estadual?:       string;
  profissao:                 string;
  profissao_descricao?:      string;
  especialidade?:            string;
  conselho_profissional?:    string;
  numero_registro_conselho?: string;
  cep?:                      string;
  logradouro?:               string;
  numero?:                   string;
  complemento?:              string;
  bairro?:                   string;
  cidade?:                   string;
  uf?:                       string;
  email?:                    string;
  telefone?:                 string;
  celular?:                  string;
  telefone_fixo?:            string;
  responsavel_legal?:        string;
  cpf_responsavel?:          string;
  estado_civil?:             string;
  nacionalidade?:            string;
}

interface Props {
  provider:      Provider;
  contractCount: number;
}

export function ProviderActions({ provider, contractCount }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const [showDelete,  setShowDelete]  = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [form, setForm] = useState<Provider>({ ...provider });

  const isPJ = form.tipo_pessoa === 'PJ' || form.tipo_pessoa === 'MEI';

  function upd(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    const res  = await fetch(`/api/providers?id=${provider.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setDeleteError(data.error || 'Erro ao excluir.'); setDeleting(false); return; }
    toast.success('Prestador excluído.');
    setShowDelete(false);
    router.refresh();
  }

  async function handleSave() {
    setSaving(true);
    const res  = await fetch(`/api/providers?id=${provider.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Erro ao salvar.'); setSaving(false); return; }
    toast.success('Dados atualizados!');
    setShowEdit(false);
    router.refresh();
    setSaving(false);
  }

  return (
    <>
      <div className="flex gap-1.5">
        <button onClick={e => { e.stopPropagation(); setShowEdit(true); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all" title="Editar">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={e => { e.stopPropagation(); setShowDelete(true); }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Excluir">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal Excluir */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-card-lg p-8 max-w-sm w-full">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-bold text-brand-900 text-lg text-center mb-2">Excluir prestador?</h3>
            <p className="text-slate-500 text-sm text-center mb-4"><strong>{provider.nome_razao_social}</strong></p>
            {deleteError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowDelete(false); setDeleteError(''); }} className="btn-secondary flex-1">Cancelar</button>
              {!deleteError && (
                <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Excluir</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar — TODOS os campos */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-card-lg max-w-2xl w-full max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-slate-100">
              <h3 className="font-bold text-brand-900 text-lg">Editar Prestador</h3>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">

              {/* Identificação */}
              <div>
                <p className="section-title mb-3">Identificação</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="cc-label">Nome / Razão Social</label>
                    <input className="cc-input" value={form.nome_razao_social || ''}
                      onChange={e => upd('nome_razao_social', capitalizeName(e.target.value))} />
                  </div>
                  {isPJ && (
                    <div>
                      <label className="cc-label">Nome Fantasia</label>
                      <input className="cc-input" value={form.nome_fantasia || ''}
                        onChange={e => upd('nome_fantasia', capitalizeName(e.target.value))} />
                    </div>
                  )}
                  {form.tipo_pessoa === 'PF' ? (
                    <div>
                      <label className="cc-label">CPF</label>
                      <input className="cc-input" value={form.cpf || ''}
                        onChange={e => upd('cpf', maskCPF(e.target.value))} maxLength={14} />
                    </div>
                  ) : (
                    <div>
                      <label className="cc-label">CNPJ</label>
                      <input className="cc-input" value={form.cnpj || ''}
                        onChange={e => upd('cnpj', maskCNPJ(e.target.value))} maxLength={18} />
                    </div>
                  )}
                  <div>
                    <label className="cc-label">{isPJ ? 'RG (responsável)' : 'RG'}</label>
                    <input className="cc-input" value={form.rg || ''}
                      onChange={e => upd('rg', maskRG(e.target.value))} maxLength={12} />
                  </div>
                  {isPJ && (
                    <div>
                      <label className="cc-label">Inscrição Municipal (ISS)</label>
                      <input className="cc-input" value={form.inscricao_municipal || ''}
                        onChange={e => upd('inscricao_municipal', maskISS(e.target.value))} maxLength={16} />
                    </div>
                  )}
                  {isPJ && (
                    <div>
                      <label className="cc-label">Inscrição Estadual (IE)</label>
                      <input className="cc-input" value={form.inscricao_estadual || ''}
                        onChange={e => upd('inscricao_estadual', maskIE(e.target.value, form.uf || ''))} maxLength={20} />
                    </div>
                  )}
                  {form.tipo_pessoa === 'PF' && (
                    <>
                      <div>
                        <label className="cc-label">Estado Civil</label>
                        <select className="cc-select" value={form.estado_civil || ''}
                          onChange={e => upd('estado_civil', e.target.value)}>
                          <option value="">Selecione</option>
                          {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'].map(v =>
                            <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="cc-label">Nacionalidade</label>
                        <input className="cc-input" value={form.nacionalidade || ''}
                          onChange={e => upd('nacionalidade', e.target.value)} placeholder="Brasileira" />
                      </div>
                    </>
                  )}
                  {isPJ && (
                    <>
                      <div>
                        <label className="cc-label">Responsável Legal</label>
                        <input className="cc-input" value={form.responsavel_legal || ''}
                          onChange={e => upd('responsavel_legal', capitalizeName(e.target.value))} />
                      </div>
                      <div>
                        <label className="cc-label">CPF do Responsável</label>
                        <input className="cc-input" value={form.cpf_responsavel || ''}
                          onChange={e => upd('cpf_responsavel', maskCPF(e.target.value))} maxLength={14} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Profissão */}
              <div>
                <p className="section-title mb-3">Dados Profissionais</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="cc-label">Conselho Profissional</label>
                    <input className="cc-input" value={form.conselho_profissional || ''}
                      onChange={e => upd('conselho_profissional', e.target.value)} placeholder="Ex: CRP" />
                  </div>
                  <div>
                    <label className="cc-label">Nº Registro no Conselho</label>
                    <input className="cc-input" value={form.numero_registro_conselho || ''}
                      onChange={e => upd('numero_registro_conselho', e.target.value)} />
                  </div>
                  <div>
                    <label className="cc-label">Especialidade</label>
                    <input className="cc-input" value={form.especialidade || ''}
                      onChange={e => upd('especialidade', e.target.value)} />
                  </div>
                  <div>
                    <label className="cc-label">Descrição da Profissão</label>
                    <input className="cc-input" value={form.profissao_descricao || ''}
                      onChange={e => upd('profissao_descricao', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <p className="section-title mb-3">Endereço</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="cc-label">CEP</label>
                    <input className="cc-input" value={form.cep || ''}
                      onChange={e => upd('cep', maskCEP(e.target.value))} maxLength={9} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="cc-label">Logradouro</label>
                    <input className="cc-input" value={form.logradouro || ''}
                      onChange={e => upd('logradouro', e.target.value)} />
                  </div>
                  <div>
                    <label className="cc-label">Número</label>
                    <input className="cc-input" value={form.numero || ''}
                      onChange={e => upd('numero', e.target.value)} />
                  </div>
                  <div>
                    <label className="cc-label">Complemento</label>
                    <input className="cc-input" value={form.complemento || ''}
                      onChange={e => upd('complemento', e.target.value)} />
                  </div>
                  <div>
                    <label className="cc-label">Bairro</label>
                    <input className="cc-input" value={form.bairro || ''}
                      onChange={e => upd('bairro', e.target.value)} />
                  </div>
                  <div>
                    <label className="cc-label">Cidade</label>
                    <input className="cc-input" value={form.cidade || ''}
                      onChange={e => upd('cidade', e.target.value)} />
                  </div>
                  <div>
                    <label className="cc-label">UF</label>
                    <select className="cc-select" value={form.uf || ''}
                      onChange={e => upd('uf', e.target.value)}>
                      <option value="">UF</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div>
                <p className="section-title mb-3">Contato</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="cc-label">E-mail</label>
                    <input type="email" className="cc-input" value={form.email || ''}
                      onChange={e => upd('email', e.target.value)} />
                  </div>
                  <div>
                    <label className="cc-label">Celular</label>
                    <input className="cc-input" value={form.celular || ''}
                      onChange={e => upd('celular', maskPhone(e.target.value))} maxLength={16} />
                  </div>
                  <div>
                    <label className="cc-label">Telefone Fixo</label>
                    <input className="cc-input" value={form.telefone_fixo || ''}
                      onChange={e => upd('telefone_fixo', maskPhone(e.target.value))} maxLength={15} />
                  </div>
                </div>
              </div>

            </div>

            <div className="flex gap-3 px-8 py-6 border-t border-slate-100">
              <button onClick={() => setShowEdit(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : <><Check className="w-4 h-4" /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
