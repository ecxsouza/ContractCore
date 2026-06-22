'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Loader2, Minimize2,
  Sparkles, RefreshCw, ChevronDown, ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import type { ContractFormData } from '@/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Source {
  title: string;
  url:   string;
}

interface Message {
  id:       string;
  role:     'user' | 'assistant';
  content:  string;
  sources?: Source[];   // fontes de busca web, se houver
  thinking?: boolean;   // indicador de "consultando..."
}

export interface AssistantChatProps {
  pageContext?: string;                   // ex: "Dashboard" ou "Novo Contrato — Etapa 2 (Serviço)"
  formData?:   Partial<ContractFormData>; // dados do wizard, se disponível
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_MSG_CHARS = 500; // deve ser igual ao backend

const SUGESTOES_INICIAIS = [
  'Como criar um novo contrato?',
  'Qual o risco de pejotização?',
  'Quando usar PJ, MEI ou PF?',
  'O que colocar no campo Objeto?',
  'Como encontrar contratos pendentes?',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Resume o formData em texto curto e seguro.
 * Nunca inclui dados pessoais completos (CPF, RG, CNPJ completo, endereço, e-mail, telefone).
 * LGPD: dados de pacientes jamais devem ser enviados.
 */
function resumirFormData(formData?: Partial<ContractFormData>): string | undefined {
  if (!formData) return undefined;
  const partes: string[] = [];

  const p = formData.provider;
  if (p) {
    if (p.profissao)             partes.push(`Profissão: ${p.profissao}`);
    if (p.tipo_pessoa)           partes.push(`Tipo: ${p.tipo_pessoa}`);
    if (p.especialidade)         partes.push(`Especialidade: ${p.especialidade}`);
    if (p.conselho_profissional) partes.push(`Conselho: ${p.conselho_profissional}`);
  }

  const s = formData.service;
  if (s) {
    if (s.objeto)              partes.push(`Objeto: ${s.objeto}`);
    if (s.modalidade)          partes.push(`Modalidade: ${s.modalidade}`);
    if (s.periodicidade)       partes.push(`Periodicidade: ${s.periodicidade}`);
    if (s.exclusividade !== undefined) partes.push(`Exclusividade: ${s.exclusividade ? 'Sim' : 'Não'}`);
    // Local resumido — sem endereço completo
    if (s.local_prestacao) {
      const localResumido = s.local_prestacao.length > 80
        ? s.local_prestacao.slice(0, 80) + '…'
        : s.local_prestacao;
      partes.push(`Local: ${localResumido}`);
    }
  }

  const r = formData.remuneration;
  if (r) {
    if (r.valor_descricao)   partes.push(`Valor: ${r.valor_descricao}`);
    if (r.emite_nota_fiscal) partes.push(`NF: ${r.emite_nota_fiscal}`);
    if (r.modelos?.length)   partes.push(`Modelos: ${r.modelos.join(', ')}`);
  }

  if (formData.anexos?.length) {
    partes.push(`Anexos selecionados: ${formData.anexos.length}`);
  }

  if (formData.vigencia_indeterminada !== undefined) {
    partes.push(`Vigência: ${formData.vigencia_indeterminada ? 'indeterminada' : 'determinada'}`);
  }

  return partes.length > 0 ? partes.join(' | ') : undefined;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AssistantChat({ pageContext, formData }: AssistantChatProps) {
  const [open,      setOpen]      = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [unread,    setUnread]    = useState(0);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  // Scroll automático ao novo conteúdo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Foco no input ao abrir
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, minimized]);

  // Zera contador de não lidos ao abrir
  useEffect(() => {
    if (open && !minimized) setUnread(0);
  }, [open, minimized]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setMinimized(false);
  }, []);

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    setOpen(false);
    setMinimized(false);
  }, []);

  const handleMinimize = useCallback(() => {
    setMinimized(m => !m);
  }, []);

  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(false);
    setInput('');
    setInputError(null);
  }, []);

  // Valida o input antes de enviar — também no frontend para feedback rápido
  const validateInput = useCallback((text: string): string | null => {
    if (!text.trim()) return null;
    if (text.length > MAX_MSG_CHARS) {
      return `Mensagem muito longa (${text.length}/${MAX_MSG_CHARS} caracteres). Seja mais conciso.`;
    }
    return null;
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (inputError && val.length <= MAX_MSG_CHARS) setInputError(null);
  }, [inputError]);

  // Envia mensagem e processa streaming SSE
  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || streaming) return;

    // Validação de tamanho
    const err = validateInput(userText);
    if (err) {
      setInputError(err);
      return;
    }
    setInputError(null);

    const userMsg: Message = { id: makeId(), role: 'user',      content: userText };
    const asstMsg: Message = { id: makeId(), role: 'assistant', content: '', thinking: true };

    setMessages(prev => [...prev, userMsg, asstMsg]);
    setInput('');
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      // Constrói o histórico para a API (sem a mensagem "thinking" atual)
      // Limit: apenas as últimas MAX_HISTORY_MSGS - 1 mensagens + a nova do usuário
      const FRONTEND_HISTORY_LIMIT = 10;
      const apiMessages = [...messages, userMsg]
        .slice(-FRONTEND_HISTORY_LIMIT)
        .map(m => ({ role: m.role, content: m.content }));

      const formContext = resumirFormData(formData);

      const res = await fetch('/api/assistant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abort.signal,
        body:    JSON.stringify({
          messages:    apiMessages,
          pageContext,
          formContext,
        }),
      });

      if (!res.ok) {
        // Erro HTTP (401, 429, 400, 500)
        let errorMsg = 'Erro ao conectar ao assistente.';
        try {
          const errData = await res.json();
          if (errData?.error) errorMsg = errData.error;
        } catch { /* ignora parse error */ }
        throw new Error(errorMsg);
      }

      if (!res.body) {
        throw new Error('Resposta do servidor não disponível.');
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';
      let   asstContent    = '';
      let   collectedSources: Source[] = [];
      let   firstToken     = true;
      let   receivedDone   = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(raw);
          } catch {
            // Linha parcial — aguarda próximo chunk
            continue;
          }

          // ── Erro do servidor via SSE ──────────────────────────────
          if (parsed.type === 'error' && typeof parsed.error === 'string') {
            throw new Error(parsed.error);
          }

          // ── Delta de texto ────────────────────────────────────────
          if (parsed.type === 'delta' && typeof parsed.text === 'string' && parsed.text) {
            if (firstToken) {
              firstToken = false;
              // Remove indicador "thinking" ao receber primeiro token
              setMessages(prev => prev.map(m =>
                m.id === asstMsg.id ? { ...m, thinking: false } : m
              ));
            }
            asstContent += parsed.text;
            setMessages(prev => prev.map(m =>
              m.id === asstMsg.id ? { ...m, content: asstContent } : m
            ));
          }

          // ── Fontes de busca web ───────────────────────────────────
          if (parsed.type === 'sources' && Array.isArray(parsed.sources)) {
            collectedSources = (parsed.sources as Source[]).filter(
              s => s.url && s.url.startsWith('http')
            );
          }

          // ── Sinalização de fim ────────────────────────────────────
          if (parsed.type === 'done') {
            receivedDone = true;
            // Adiciona fontes à mensagem do assistente, se houver
            if (collectedSources.length > 0) {
              setMessages(prev => prev.map(m =>
                m.id === asstMsg.id ? { ...m, sources: collectedSources } : m
              ));
            }
          }
        }

        if (receivedDone) break;
      }

      // Segurança: se nenhum texto foi recebido, exibir fallback
      if (!asstContent && !receivedDone) {
        setMessages(prev => prev.map(m =>
          m.id === asstMsg.id
            ? { ...m, content: 'Não consegui obter resposta agora. Tente novamente em instantes.', thinking: false }
            : m
        ));
      }

      // Conta mensagem não lida se painel minimizado ou fechado
      if (minimized || !open) setUnread(n => n + 1);

    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // Usuário fechou o chat — remove a mensagem "thinking"
        setMessages(prev => prev.filter(m => m.id !== asstMsg.id));
      } else {
        const msg = err instanceof Error ? err.message : 'Erro de conexão';
        setMessages(prev => prev.map(m =>
          m.id === asstMsg.id
            ? { ...m, content: msg, thinking: false }
            : m
        ));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming, pageContext, formData, minimized, open, validateInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  // Contagem de chars para o input
  const charsLeft = MAX_MSG_CHARS - input.length;
  const charsWarning = input.length > MAX_MSG_CHARS * 0.85;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Botão flutuante (visível apenas quando fechado) ── */}
      {!open && (
        <button
          onClick={handleOpen}
          className={clsx(
            'fixed bottom-6 right-6 z-50',
            'w-14 h-14 rounded-full shadow-lg',
            'bg-gradient-to-br from-brand-700 to-brand-900',
            'border-2 border-brand-600/30',
            'flex items-center justify-center',
            'transition-all duration-300 hover:scale-110 hover:shadow-xl',
            'group'
          )}
          title="Assistente ContractCore"
          aria-label="Abrir assistente"
        >
          <MessageCircle className="w-6 h-6 text-white group-hover:hidden" />
          <Sparkles      className="w-6 h-6 text-gold-400 hidden group-hover:block" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gold-500 text-brand-900 text-xs font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* ── Painel de chat ── */}
      {open && (
        <div
          className={clsx(
            'fixed bottom-0 right-0 z-50',
            // Mobile: largura total; Desktop: 380px–420px
            'w-full sm:w-[390px] lg:w-[420px]',
            'flex flex-col',
            'bg-white border-l border-t border-slate-200/80',
            'rounded-tl-2xl shadow-2xl',
            'transition-all duration-300',
            // Altura:
            // - Minimizado: apenas o header (h-14)
            // - Mobile: quase tela cheia (menos 1rem de margem)
            // - Desktop: altura total disponível até 100vh, com margem de 4rem do topo
            //   (comportamento de chat completo, mais imersivo que max-h fixo)
            minimized
              ? 'h-14'
              : 'h-[calc(100svh-1rem)] sm:h-[calc(100vh-4rem)]'
          )}
          // Impede rolagem horizontal no mobile
          style={{ overflowX: 'hidden' }}
        >
          {/* ── Cabeçalho ── */}
          <div className={clsx(
            'flex items-center gap-3 px-4 py-3 flex-shrink-0',
            'bg-gradient-to-r from-brand-900 to-brand-800',
            'rounded-tl-2xl',
          )}>
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-gold-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">Assistente ContractCore</p>
              <p className="text-white/50 text-2xs leading-tight truncate">
                {pageContext ?? 'Mesa Técnica · Guia da plataforma'}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={handleClear}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  title="Limpar conversa"
                  aria-label="Limpar conversa"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleMinimize}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title={minimized ? 'Expandir' : 'Minimizar'}
                aria-label={minimized ? 'Expandir' : 'Minimizar'}
              >
                {minimized
                  ? <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                  : <Minimize2   className="w-3.5 h-3.5" />
                }
              </button>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title="Fechar"
                aria-label="Fechar assistente"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Corpo (escondido quando minimizado) ── */}
          {!minimized && (
            <>
              {/* Área de mensagens */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overscroll-contain">

                {/* Estado inicial — sugestões */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-brand-900 text-sm">Mesa Técnica Multidisciplinar</p>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed max-w-xs">
                        Tire dúvidas sobre a plataforma, contratos e legislação. Receba orientação técnica preliminar.
                      </p>
                    </div>
                    <div className="w-full space-y-2">
                      {SUGESTOES_INICIAIS.map(s => (
                        <button
                          key={s}
                          onClick={() => sendMessage(s)}
                          disabled={streaming}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <p className="text-2xs text-slate-400 text-center leading-relaxed max-w-xs">
                      As respostas são orientações técnicas preliminares e não constituem parecer jurídico.
                    </p>
                  </div>
                )}

                {/* Mensagens */}
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      </div>
                    )}
                    <div className={clsx('flex flex-col gap-1.5', msg.role === 'user' ? 'items-end' : 'items-start', 'max-w-[82%]')}>
                      <div
                        className={clsx(
                          'px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed',
                          'break-words overflow-wrap-anywhere',
                          msg.role === 'user'
                            ? 'bg-brand-700 text-white rounded-br-sm'
                            : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-sm'
                        )}
                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                      >
                        {msg.thinking ? (
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                            Consultando a Mesa Técnica…
                          </span>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {/* Fontes de busca web */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="text-2xs text-slate-400 space-y-0.5 pl-0.5">
                          <p className="font-semibold text-slate-500">Fontes consultadas:</p>
                          {msg.sources.map((src, i) => (
                            <a
                              key={i}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-brand-600 hover:text-brand-800 hover:underline transition-colors truncate max-w-[260px]"
                            >
                              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{src.title || src.url}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div ref={bottomRef} />
              </div>

              {/* ── Área de input ── */}
              <div className="border-t border-slate-100 px-3 py-3 flex-shrink-0">
                <div className={clsx(
                  'flex items-end gap-2 rounded-xl border px-3 py-2 transition-colors',
                  inputError
                    ? 'bg-red-50 border-red-300'
                    : 'bg-slate-50 border-slate-200 focus-within:border-brand-400 focus-within:bg-white'
                )}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={streaming}
                    placeholder="Pergunte sobre o sistema ou o contrato…"
                    rows={1}
                    maxLength={MAX_MSG_CHARS + 50} // permite digitar um pouco além para ver o erro
                    className={clsx(
                      'flex-1 resize-none bg-transparent text-xs text-slate-800',
                      'placeholder:text-slate-400 outline-none leading-relaxed',
                      'max-h-24 overflow-y-auto',
                      streaming && 'opacity-50'
                    )}
                    style={{ minHeight: '1.5rem' }}
                    aria-label="Mensagem para o assistente"
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || streaming || !!inputError}
                    className={clsx(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
                      input.trim() && !streaming && !inputError
                        ? 'bg-brand-700 hover:bg-brand-800 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    )}
                    title="Enviar (Enter)"
                    aria-label="Enviar mensagem"
                  >
                    {streaming
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Send    className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>

                {/* Erro de validação */}
                {inputError && (
                  <p className="text-2xs text-red-500 mt-1 px-0.5">{inputError}</p>
                )}

                {/* Contador de chars — aparece quando próximo do limite */}
                {charsWarning && !inputError && (
                  <p className={clsx(
                    'text-2xs mt-1 px-0.5 text-right',
                    charsLeft < 0 ? 'text-red-500 font-semibold' : 'text-amber-500'
                  )}>
                    {charsLeft < 0 ? `${Math.abs(charsLeft)} acima do limite` : `${charsLeft} restantes`}
                  </p>
                )}

                {/* Hint de teclado */}
                {!inputError && !charsWarning && (
                  <p className="text-2xs text-slate-400 text-center mt-1.5">
                    Enter para enviar · Shift+Enter para nova linha
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
