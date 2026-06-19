'use client';

import { useState } from 'react';
import { BookmarkPlus, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface Props {
  contractId:           string;
  profissao:            string;
  providerNome:         string;
  providerEspecialidade?: string;
  providerConselho?:      string;
}

const PROFISSAO_LABELS: Record<string, string> = {
  psicologo:      'Psicólogo(a)',
  neuropsicologo: 'Neuropsicólogo(a)',
  fonoaudiologo:  'Fonoaudiólogo(a)',
  psicopedagogo:  'Psicopedagogo(a)',
  secretaria:     'Secretária',
  recepcionista:  'Recepcionista',
  coordenador:    'Coordenador(a)',
  outro:          'Outro',
};

export function SaveAsTemplateButton({
  contractId, profissao, providerNome,
  providerEspecialidade, providerConselho,
}: Props) {
  const supabase = createClient();
  const [showModal, setShowModal] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [nome,      setNome]      = useState(
    `${PROFISSAO_LABELS[profissao] || profissao} — Template`
  );
  const [descricao, setDescricao] = useState('');

  async function handleSave() {
    setSaving(true);
    try {
      // Buscar dados do contrato (objeto, remuneração, anexos)
      const { data: contract } = await supabase
        .from('contracts')
        .select('service_details, remuneration, anexos, company_id')
        .eq('id', contractId)
        .single();

      if (!contract) throw new Error('Contrato não encontrado');

      const { error } = await supabase.from('contract_templates').insert({
        company_id:        contract.company_id,
        profissao:         profissao,
        nome:              nome.trim(),
        descricao:         descricao.trim() || null,
        is_sistema:        false,
        // Dados profissionais — pré-preenchem a aba Prestador ao usar o template
        provider_data: {
          profissao,
          especialidade:         providerEspecialidade || undefined,
          conselho_profissional: providerConselho       || undefined,
        },
        service_data:      contract.service_details || {},
        remuneration_data: contract.remuneration    || {},
        anexos_padrao:     contract.anexos           || [],
        uso_count:         0,
      });

      if (error) throw error;

      toast.success('Template salvo! Disponível em Templates.');
      setShowModal(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar template.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-ghost text-xs gap-1.5"
        title="Salvar este contrato como template reutilizável"
      >
        <BookmarkPlus className="w-3.5 h-3.5" /> Salvar como Template
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-card-lg p-8 max-w-md w-full animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-brand-900 text-lg">Salvar como Template</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800">
                O template será salvo com profissão, especialidade, conselho profissional,
                objeto, remuneração e anexos deste contrato.
                Aparecerá na página <strong>Templates</strong> para reutilizar em contratos futuros.
              </div>

              <div className="flex gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Templates são pontos de partida baseados na prática de mercado. Sempre revise
                  cada campo de acordo com a realidade do novo contrato antes de finalizar.
                </span>
              </div>

              <div>
                <label className="cc-label">Nome do template</label>
                <input
                  className="cc-input"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Psicólogo Clínico — Padrão"
                />
              </div>

              <div>
                <label className="cc-label">Descrição (opcional)</label>
                <textarea
                  className="cc-textarea"
                  rows={2}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Contrato padrão para psicólogos com atendimento presencial por sessão"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving || !nome.trim()} className="btn-primary flex-1">
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
                    : <><Check className="w-4 h-4" /> Salvar Template</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
