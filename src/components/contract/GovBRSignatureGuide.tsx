'use client';

import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  contractNum: string;
}

const STEPS = [
  {
    n: 1,
    titulo: 'Acesse o GOV.BR Assinaturas',
    desc: 'Abra o navegador e acesse o portal oficial de assinaturas digitais do governo brasileiro.',
    acao: 'Acessar portal',
    url: 'https://assinador.iti.br',
    dica: 'Disponível 24h, gratuito para qualquer cidadão com conta GOV.BR nível Prata ou Ouro.',
  },
  {
    n: 2,
    titulo: 'Faça login com sua conta GOV.BR',
    desc: 'Clique em "Entrar com GOV.BR". Você precisará de conta com nível de confiança Prata (reconhecimento facial) ou Ouro (certificado ICP-Brasil).',
    acao: 'Verificar meu nível',
    url: 'https://acesso.gov.br/',
    dica: 'Nível Prata: selfie com documento. Nível Ouro: banco ou certificado digital. Para validade jurídica do contrato, Prata já é suficiente.',
  },
  {
    n: 3,
    titulo: 'Faça o download do contrato em PDF',
    desc: 'Nesta tela, clique em "Imprimir / PDF" e salve o arquivo PDF do contrato no seu dispositivo.',
    acao: null,
    url: null,
    dica: 'Salve como PDF usando "Salvar como PDF" na opção de impressão do navegador.',
  },
  {
    n: 4,
    titulo: 'Envie o PDF para assinatura',
    desc: 'No portal GOV.BR Assinaturas, clique em "Assinar documento", faça upload do PDF do contrato e siga as instruções na tela.',
    acao: null,
    url: null,
    dica: 'O sistema aplica a assinatura ICP-Gov.Br diretamente no PDF, com carimbo de tempo e certificado vinculado ao seu CPF.',
  },
  {
    n: 5,
    titulo: 'Envie para a outra parte assinar',
    desc: 'Após sua assinatura, baixe o PDF assinado e encaminhe à outra parte (e-mail ou WhatsApp). A outra parte repete o processo.',
    acao: null,
    url: null,
    dica: 'Cada parte assina o mesmo arquivo PDF. O arquivo assinado por ambos é o original válido. Guarde-o com segurança.',
  },
  {
    n: 6,
    titulo: 'Registre a assinatura no ContractCore',
    desc: 'Após ambas as partes assinarem, volte aqui e clique em "Registrar Assinatura" para atualizar o status do contrato no sistema.',
    acao: null,
    url: null,
    dica: 'O ContractCore registra data, hora e nome para controle interno. O documento jurídico oficial é o PDF assinado digitalmente.',
  },
];

export function GovBRSignatureGuide({ contractNum }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="cc-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-brand-900 text-sm">
              Como assinar digitalmente pelo GOV.BR (gratuito)
            </p>
            <p className="text-xs text-slate-500">
              Assinatura com validade jurídica plena — ICP-Gov.Br · Gratuito · Qualquer dispositivo
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-6 pb-6 pt-5">

          {/* Aviso de validade jurídica */}
          <div className="flex gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-6">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800 leading-relaxed">
              <strong>Validade jurídica plena:</strong> A assinatura pelo GOV.BR Assinaturas
              utiliza certificado ICP-Gov.Br e tem validade jurídica reconhecida pela
              Medida Provisória 2.200-2/2001, com a mesma força probatória de assinatura com certificado ICP-Brasil.
              É aceita em contratos civis, comerciais e documentos empresariais.
            </div>
          </div>

          {/* Aviso de integração */}
          <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong>Sobre integração direta:</strong> O GOV.BR Assinaturas não disponibiliza API pública
              para integração de terceiros. Por isso, o fluxo é manual mas simples — siga o passo a passo abaixo.
              Plataformas como <strong>ClickSign</strong> e <strong>DocuSign</strong> oferecem API de integração
              (pagas) — podemos integrar no futuro se desejar.
            </div>
          </div>

          {/* Passo a passo */}
          <div className="space-y-4">
            {STEPS.map((step) => (
              <div key={step.n} className="flex gap-4">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-brand-800 text-white flex items-center justify-center text-xs font-bold">
                    {step.n}
                  </div>
                  {step.n < STEPS.length && <div className="w-0.5 h-full bg-brand-200 mt-1 min-h-[24px]" />}
                </div>
                <div className="flex-1 pb-2">
                  <p className="font-semibold text-brand-900 text-sm mb-1">{step.titulo}</p>
                  <p className="text-slate-600 text-xs leading-relaxed mb-2">{step.desc}</p>
                  {step.dica && (
                    <p className="text-xs text-slate-400 italic">💡 {step.dica}</p>
                  )}
                  {step.acao && step.url && (
                    <a
                      href={step.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-brand-800 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-all"
                    >
                      {step.acao}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-brand-50 border border-brand-200 rounded-xl">
            <p className="text-xs text-brand-800 leading-relaxed">
              <strong>Após ambas as partes assinarem:</strong> Guarde o PDF final assinado em local seguro
              (nuvem + cópia local). Recomendamos manter o arquivo por <strong>10 anos</strong>, conforme
              prazo prescricional de contratos. Registre também a assinatura aqui no ContractCore para
              controle interno do contrato <strong>{contractNum}</strong>.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
