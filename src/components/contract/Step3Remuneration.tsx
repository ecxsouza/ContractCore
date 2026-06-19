'use client';

import { useEffect } from 'react';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Info, AlertTriangle } from 'lucide-react';
import { maskCurrencyInput, parseCurrencyInput } from '@/lib/masks';
import type { RemunerationDetails, RemunerationModel, PaymentMethod, PersonType } from '@/types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function useScrollTop() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
}

interface Step3Props {
  data: RemunerationDetails;
  tipoPessoa: PersonType;
  cidade?: string;
  onChange: (d: Partial<RemunerationDetails>) => void;
  onBack: () => void;
  onNext: () => void;
}

const MODELOS: { value: RemunerationModel; label: string; desc: string; campoValor: { key: keyof RemunerationDetails; label: string; placeholder: string } }[] = [
  { value: 'fixo_mensal',     label: 'Fixo Mensal',       desc: 'Valor fixo todo mês, independente da quantidade de atendimentos',
    campoValor: { key: 'valor_fixo_mensal',     label: 'Valor fixo mensal (R$)', placeholder: 'Ex: 3500.00' } },
  { value: 'por_atendimento', label: 'Por Atendimento',   desc: 'Pago por cada sessão realizada',
    campoValor: { key: 'valor_por_atendimento', label: 'Valor por atendimento (R$)', placeholder: 'Ex: 250.00' } },
  { value: 'por_hora',        label: 'Por Hora',          desc: 'Pago por hora efetiva de trabalho',
    campoValor: { key: 'valor_por_hora',        label: 'Valor por hora (R$)', placeholder: 'Ex: 150.00' } },
  { value: 'por_plantao',     label: 'Por Plantão',       desc: 'Valor fixo por turno/plantão realizado',
    campoValor: { key: 'valor_fixo_mensal',     label: 'Valor por plantão (R$)', placeholder: 'Ex: 800.00' } },
  { value: 'percentual',      label: 'Percentual (%)',    desc: '% sobre o valor cobrado ao paciente',
    campoValor: { key: 'percentual',            label: 'Percentual (%)', placeholder: 'Ex: 40 (para 40%)' } },
  { value: 'pacote',          label: 'Pacote',            desc: 'Valor fechado por pacote de sessões (ex: 10 sessões)',
    campoValor: { key: 'valor_por_atendimento', label: 'Valor do pacote (R$)', placeholder: 'Ex: 2000.00 por pacote de 10 sessões' } },
  { value: 'reembolso',       label: 'Reembolso',         desc: 'Ressarcimento de despesas aprovadas previamente',
    campoValor: { key: 'valor_fixo_mensal',     label: 'Limite mensal de reembolso (R$)', placeholder: 'Ex: 500.00' } },
  { value: 'bonus',           label: 'Bônus',             desc: 'Gratificação por metas ou desempenho',
    campoValor: { key: 'valor_fixo_mensal',     label: 'Valor do bônus (R$)', placeholder: 'Ex: 1000.00 ao atingir X atendimentos/mês' } },
  { value: 'outro',           label: 'Outro',             desc: 'Modelo personalizado — descreva abaixo',
    campoValor: { key: 'valor_fixo_mensal',     label: 'Valor estimado (R$)', placeholder: 'Ex: 0.00' } },
];

const FORMAS_PAGAMENTO: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'pix',           label: 'PIX',          icon: '⚡' },
  { value: 'transferencia', label: 'Transferência', icon: '🏦' },
  { value: 'boleto',        label: 'Boleto',        icon: '📄' },
  { value: 'dinheiro',      label: 'Dinheiro',      icon: '💵' },
  { value: 'outro',         label: 'Outro',         icon: '💳' },
];

const DATAS_PAGAMENTO = [
  'todo dia 05 do mês seguinte à prestação dos serviços',
  'todo dia 10 do mês seguinte à prestação dos serviços',
  'todo dia 15 do mês seguinte à prestação dos serviços',
  'todo dia 20 do mês seguinte à prestação dos serviços',
  'no último dia útil do mês de competência',
  'em até 5 dias úteis após emissão da nota fiscal',
  'quinzenalmente, nos dias 10 e 25 de cada mês',
  'Personalizado',
];

function getSugestaoRetencoes(tipoPessoa: PersonType, cidade?: string, tipoNF?: string): string {
  const c = cidade || 'sua cidade';
  // Priorizar a seleção do card de NF — é a fonte de verdade do usuário
  if (tipoNF === 'a_definir') {
    return `PF Autônomo — Retenções que a CONTRATANTE deve fazer na fonte:\n` +
      `• INSS: 11% sobre o valor bruto (teto: R$ 908,85/mês em 2025)\n` +
      `• IRRF: tabela progressiva — isento até R$ 2.824,00; 7,5% até R$ 3.751,05; 15% até R$ 4.664,68; 22,5% até R$ 6.101,06; 27,5% acima.\n` +
      `Observação: o prestador PF não emite nota fiscal. Consulte seu contador para o cálculo exato.`;
  }
  if (tipoNF === 'dispensado_mei') {
    return `MEI — Em geral NÃO há retenção de ISS pela tomadora quando o prestador é MEI, salvo se o município de ${c} exigir expressamente.\n` +
      `• INSS e IR: responsabilidade do próprio MEI via carnê DAS mensal.\n` +
      `• Atenção: se o MEI ultrapassar R$ 81.000,00 de receita anual (2024), deverá emitir NF-e e as retenções mudam.\n` +
      `Confirme na Prefeitura de ${c} se há obrigação de retenção para serviços de saúde.`;
  }
  // PJ padrão
  return `PJ — Retenções que podem incidir:\n` +
    `• ISS: entre 2% e 5% conforme alíquota do município de ${c} (verifique na Prefeitura).\n` +
    `• IRRF: 1,5% para serviços profissionais (se a CONTRATANTE for obrigada a reter).\n` +
    `• PIS/COFINS/CSLL: 4,65% agregados se aplicável (Lei 10.833/2003).\n` +
    `Confirme com seu contador quais retentoras incidem no caso concreto.`;
}

const OPCOES_REEMBOLSO = [
  'Não há reembolso de despesas',
  'Mediante aprovação prévia por escrito',
  'Mediante apresentação de nota fiscal ou comprovante',
  'Valor fixo mensal de reembolso',
  'Regras personalizadas',
];

export function Step3Remuneration({ data, tipoPessoa, cidade, onChange, onBack, onNext }: Step3Props) {
  useScrollTop();
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [dataCustom, setDataCustom] = useState('');

  useEffect(() => {
    if (!data.emite_nota_fiscal) {
      onChange({ emite_nota_fiscal: tipoPessoa === 'MEI' ? 'dispensado_mei' : tipoPessoa === 'PF' ? 'a_definir' : 'obrigatorio' });
    }
  }, []);

  // Atualizar sugestão de retenções sempre que o tipo de NF mudar
  useEffect(() => {
    onChange({ retencoes_fiscais: getSugestaoRetencoes(tipoPessoa, cidade, data.emite_nota_fiscal) });
  }, [data.emite_nota_fiscal]);

  function toggleModelo(m: RemunerationModel) {
    const current = data.modelos || [];
    onChange({ modelos: current.includes(m) ? current.filter(x => x !== m) : [...current, m] });
  }

  function toggleFormaPagamento(f: PaymentMethod) {
    const current = data.formas_pagamento || [];
    onChange({ formas_pagamento: current.includes(f) ? current.filter(x => x !== f) : [...current, f] });
  }

  // Modelos selecionados com suas configs
  const modelosSelecionados = MODELOS.filter(m => data.modelos?.includes(m.value));

  // Exemplo dinâmico de descrição de valor
  function getPlaceholderValor(): string {
    const selecionados = data.modelos || [];
    const partes: string[] = [];
    if (selecionados.includes('fixo_mensal'))     partes.push('R$ 2.500,00 fixo por mês');
    if (selecionados.includes('por_atendimento')) partes.push('R$ 200,00 por sessão realizada');
    if (selecionados.includes('por_hora'))        partes.push('R$ 120,00 por hora trabalhada');
    if (selecionados.includes('percentual'))      partes.push('40% sobre o valor cobrado ao paciente');
    if (selecionados.includes('por_plantao'))     partes.push('R$ 700,00 por plantão de 12 horas');
    if (selecionados.includes('pacote'))          partes.push('R$ 1.800,00 por pacote de 10 sessões');
    if (selecionados.includes('bonus'))           partes.push('bônus de R$ 500,00 ao atingir 40 atendimentos/mês');
    if (partes.length === 0) return 'Ex: R$ 200,00 por atendimento realizado, de segunda a sexta, em sessões de 50 minutos.';
    return 'Ex: ' + partes.join(' + ') + '.';
  }

  // Data de pagamento — mostrar input livre apenas se "Personalizado"
  const isDataCustom = data.data_pagamento === 'Personalizado' ||
    (!DATAS_PAGAMENTO.slice(0, -1).includes(data.data_pagamento) && data.data_pagamento);

  function handleDataChange(val: string) {
    if (val === 'Personalizado') {
      onChange({ data_pagamento: 'Personalizado' });
    } else {
      onChange({ data_pagamento: val });
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!data.modelos?.length)           e.modelos = 'Selecione ao menos um modelo.';
    if (!data.valor_descricao?.trim())   e.valor_descricao = 'Descreva o valor acordado.';
    if (!data.formas_pagamento?.length)  e.formas_pagamento = 'Selecione ao menos uma forma.';
    setErrors(e);
    if (Object.keys(e).length > 0) { toast.error('Corrija os campos obrigatórios.'); return false; }
    return true;
  }

  const nfInfo: Record<string, { label: string; desc: string }> = {
    obrigatorio:    { label: 'Obrigatória (PJ)',  desc: 'Emitir NFS-e para cada pagamento' },
    dispensado_mei: { label: 'Dispensado (MEI)',  desc: 'MEI dispensado até o limite anual' },
    a_definir:      { label: 'PF Autônomo',       desc: 'Retenção na fonte pelo tomador' },
  };

  return (
    <div className="space-y-6 animate-in">

      {/* Modelos */}
      <div className="cc-card p-6">
        <div className="section-title">Modelo(s) de Remuneração</div>
        <p className="text-slate-500 text-sm mb-4">Pode selecionar mais de um. Ex: fixo + percentual.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODELOS.map(m => {
            const selected = data.modelos?.includes(m.value);
            return (
              <button key={m.value} type="button" onClick={() => toggleModelo(m.value)}
                className={clsx('flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all',
                  selected ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-200')}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{m.label}</span>
                  {selected && <div className="w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  </div>}
                </div>
                <span className="text-xs opacity-70">{m.desc}</span>
              </button>
            );
          })}
        </div>
        {errors.modelos && <p className="text-red-500 text-xs mt-2">{errors.modelos}</p>}
      </div>

      {/* Detalhamento de valores — um campo por modelo selecionado */}
      {modelosSelecionados.length > 0 && (
        <div className="cc-card p-6">
          <div className="section-title">Detalhamento dos Valores</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {modelosSelecionados.map(m => (
              <div key={m.value}>
                <label className="cc-label">{m.campoValor.label}</label>
                {m.value === 'percentual' ? (
                  <div className="relative">
                    <input
                      type="number" min={0} max={100} step={0.5}
                      className="cc-input pr-8"
                      value={(data as any)[m.campoValor.key] || ''}
                      onChange={e => onChange({ [m.campoValor.key]: parseFloat(e.target.value) || undefined })}
                      placeholder="Ex: 40"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">%</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    className="cc-input"
                    value={(data as any)[m.campoValor.key]
                      ? maskCurrencyInput(String(Math.round(((data as any)[m.campoValor.key] || 0) * 100)))
                      : ''}
                    onChange={e => {
                      const num = parseCurrencyInput(e.target.value);
                      onChange({ [m.campoValor.key]: num || undefined });
                    }}
                    placeholder={m.campoValor.placeholder.includes('R$') ? m.campoValor.placeholder : 'R$ 0,00'}
                  />
                )}
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="cc-label mb-0">Descrição Completa do Valor <span className="text-red-500">*</span></label>
              {!data.valor_descricao && (
                <button
                  type="button"
                  onClick={() => onChange({ valor_descricao: getPlaceholderValor().replace(/^Ex: /, '') })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold-500 hover:bg-gold-600 text-white text-2xs font-semibold rounded-lg transition-all flex-shrink-0"
                >
                  ✦ Usar sugestão
                </button>
              )}
            </div>
            <textarea
              className={clsx('cc-textarea', errors.valor_descricao && 'error')}
              rows={3}
              value={data.valor_descricao}
              onChange={e => onChange({ valor_descricao: e.target.value })}
              placeholder={getPlaceholderValor()}
            />
            <p className="text-2xs text-slate-400 mt-1">Descreva em detalhes como o profissional será remunerado. Quanto mais claro, melhor o contrato.</p>
            {errors.valor_descricao && <p className="text-red-500 text-xs mt-1">{errors.valor_descricao}</p>}
          </div>
        </div>
      )}

      {/* Data e Forma de Pagamento */}
      <div className="cc-card p-6">
        <div className="section-title">Data e Forma de Pagamento</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div>
            <label className="cc-label">Prazo de Pagamento <span className="text-red-500">*</span></label>
            <select className="cc-select" value={isDataCustom ? 'Personalizado' : (data.data_pagamento || '')}
              onChange={e => handleDataChange(e.target.value)}>
              <option value="">— Selecione —</option>
              {DATAS_PAGAMENTO.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {/* Campo livre — só aparece se "Personalizado" */}
            {isDataCustom && (
              <input
                className="cc-input mt-2"
                value={data.data_pagamento === 'Personalizado' ? '' : data.data_pagamento}
                onChange={e => onChange({ data_pagamento: e.target.value })}
                placeholder="Descreva o prazo personalizado de pagamento..."
              />
            )}
          </div>

          <div>
            <label className="cc-label">Formas de Pagamento <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2 mt-1">
              {FORMAS_PAGAMENTO.map(f => {
                const selected = data.formas_pagamento?.includes(f.value);
                return (
                  <button key={f.value} type="button" onClick={() => toggleFormaPagamento(f.value)}
                    className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                      selected ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-brand-200')}>
                    <span>{f.icon}</span> {f.label}
                  </button>
                );
              })}
            </div>
            {/* Campo "Outro" — aparece só se selecionado */}
            {data.formas_pagamento?.includes('outro') && (
              <input
                className="cc-input mt-2"
                value={data.forma_pagamento_outro_detalhe || ''}
                onChange={e => onChange({ forma_pagamento_outro_detalhe: e.target.value })}
                placeholder="Qual é a outra forma de pagamento? Ex: Cheque, Permuta de serviços..."
              />
            )}
            {errors.formas_pagamento && <p className="text-red-500 text-xs mt-1">{errors.formas_pagamento}</p>}
          </div>
        </div>
      </div>

      {/* Nota Fiscal */}
      <div className="cc-card p-6">
        <div className="section-title">Nota Fiscal de Serviços</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {([
            { val: 'obrigatorio',    label: 'Obrigatória (PJ)',   desc: 'Emitir NFS-e para cada pagamento recebido. Condição para liberação do valor.' },
            { val: 'dispensado_mei', label: 'Dispensado (MEI)',   desc: 'MEI pode ser dispensado de emitir NF enquanto a receita bruta anual não ultrapassar R$ 81.000,00 (2024). Acima deste limite, a emissão se torna obrigatória.' },
            { val: 'a_definir',      label: 'PF Autônomo',        desc: 'Prestador PF não emite NF-e. O tomador pode ser obrigado a reter INSS e IRRF na fonte.' },
          ] as const).map(({ val, label, desc }) => (
            <button key={val} type="button" onClick={() => onChange({ emite_nota_fiscal: val })}
              className={clsx('p-4 rounded-xl border-2 text-left transition-all',
                data.emite_nota_fiscal === val ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-200')}>
              <div className="text-sm font-semibold text-brand-900">{label}</div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</div>
            </button>
          ))}
        </div>
        {tipoPessoa === 'PF' && data.emite_nota_fiscal === 'dispensado_mei' && (
          <div className="flex gap-2.5 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Atenção: o prestador foi classificado como <strong>Pessoa Física</strong>, mas a regra fiscal
              selecionada é de <strong>MEI</strong>. Confirme se o vínculo jurídico correto é MEI ou ajuste
              a regra fiscal antes da assinatura.
            </span>
          </div>
        )}
        <div>
          <label className="cc-label">Retenções Fiscais Previstas</label>
          <textarea
            className="cc-textarea text-xs"
            rows={4}
            value={data.retencoes_fiscais || ''}
            onChange={e => onChange({ retencoes_fiscais: e.target.value })}
          />
          <p className="text-2xs mt-1 font-medium" style={{color:'#c2510a'}}>
            ⚠️ Sugestão automática baseada no vínculo ({tipoPessoa}) e endereço da clínica. Confirme com seu contador antes de assinar.
          </p>
        </div>
      </div>

      {/* Reembolso */}
      <div className="cc-card p-6">
        <div className="section-title">Reembolso de Despesas</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {OPCOES_REEMBOLSO.map(opt => (
            <button key={opt} type="button" onClick={() => onChange({ reembolso_tipo: opt })}
              className={clsx('p-3 rounded-lg border text-xs text-left font-medium transition-all',
                data.reembolso_tipo === opt ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-brand-200')}>
              {data.reembolso_tipo === opt ? '✓ ' : ''}{opt}
            </button>
          ))}
        </div>
        {data.reembolso_tipo && data.reembolso_tipo !== 'Não há reembolso de despesas' && (
          <textarea className="cc-textarea" rows={2} value={data.reembolso_descricao || ''}
            onChange={e => onChange({ reembolso_descricao: e.target.value })}
            placeholder="Detalhe as condições de reembolso. Ex: Máximo R$ 300,00/mês mediante comprovante em até 5 dias úteis." />
        )}
      </div>

      <div className="flex gap-2 p-4 bg-brand-50 border border-brand-200 rounded-xl">
        <Info className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-relaxed">
          <strong>Contador + DP:</strong> Os valores preenchidos aqui vão para o contrato. Certifique-se de que o modelo escolhido não caracteriza salário fixo com subordinação — isso aumenta o risco trabalhista. Prefira remunerar por produção sempre que possível.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="btn-secondary"><ChevronLeft className="w-4 h-4" /> Voltar</button>
        <button type="button" onClick={() => validate() && onNext()} className="btn-primary">Próxima etapa <ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
