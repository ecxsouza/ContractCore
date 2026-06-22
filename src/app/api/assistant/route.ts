export const dynamic     = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { createClient }  from '@/lib/supabase/server';
import Anthropic          from '@anthropic-ai/sdk';

// ─── Cliente Anthropic ────────────────────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey:  process.env.ANTHROPIC_API_KEY!,
  timeout: 58_000,
});

// ─── Modelo — usa a mesma env do resto do sistema ────────────────────────────

function getModel(): string {
  const m = process.env.ANTHROPIC_MODEL?.trim();
  // Aceita qualquer valor da env; fallback apenas se vazia/ausente
  if (m && m.length > 0) return m;
  return 'claude-sonnet-4-6';
}

// ─── Rate limit em memória (best-effort) ─────────────────────────────────────
// ATENÇÃO: Em ambiente serverless (Vercel), cada instância tem seu próprio
// mapa em memória. Este rate limit é best-effort — não persiste entre
// instâncias paralelas. Para produção de alta escala, usar Supabase ou Redis.
// Para o estágio atual (beta fechado, poucos usuários), é suficiente.

const RATE_LIMIT_MAX  = 20;   // mensagens por usuário por hora
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1_000; // 1 hora

const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs: number } {
  const now   = Date.now();
  const entry = rateMap.get(userId);

  if (!entry || now > entry.resetAt) {
    // Novo período
    rateMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

// ─── Limites ──────────────────────────────────────────────────────────────────

const MAX_USER_MSG_CHARS  = 500;   // máx. caracteres por mensagem do usuário
const MAX_HISTORY_MSGS    = 10;    // máx. mensagens enviadas ao Claude
const MAX_FORM_CTX_CHARS  = 3_000; // máx. caracteres do formContext
const MAX_PAGE_CTX_CHARS  = 500;   // máx. caracteres do pageContext
const WEB_SEARCH_MAX_USES = 3;     // máx. chamadas de busca web por resposta

// ─── Feature flag: busca web ─────────────────────────────────────────────────
// Defina ENABLE_ASSISTANT_WEB_SEARCH=true no Vercel para habilitar.
// Por padrão está desabilitada para evitar custos imprevistos.

function isWebSearchEnabled(): boolean {
  return process.env.ENABLE_ASSISTANT_WEB_SEARCH === 'true';
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é o Assistente ContractCore, um assistente virtual especializado em:
1. Guiar usuários na plataforma ContractCore Elite — SaaS de governança contratual para clínicas de psicologia e saúde no Brasil.
2. Orientar sobre contratos de prestação de serviços com profissionais autônomos (PJ, MEI, PF).
3. Sugerir conteúdo para campos do formulário de Novo Contrato com base no contexto fornecido.
4. Esclarecer dúvidas sobre legislação, LGPD, CFP/CRP e normas aplicáveis.

IDENTIDADE:
Você é um assistente de IA inspirado na Mesa Técnica Multidisciplinar do sistema, que simula perspectivas técnicas de áreas como jurídico, RH, contabilidade, saúde, ética profissional e compliance.
Você não é um advogado, contador, psicólogo ou qualquer outro profissional humano. Não substitui consultoria especializada.

COMO RESPONDER:
- Sempre em português brasileiro, claro e objetivo.
- Respostas curtas por padrão (3-5 parágrafos); expanda apenas se solicitado.
- Use linguagem jurídica PRUDENTE: nunca "nulo", "ilegal" ou "inválido" de forma absoluta.
  Prefira: "apresenta risco jurídico", "juridicamente frágil", "pode configurar infração", "merece validação".
- Em temas trabalhistas, tributários, regulatórios ou de conselho profissional, sempre recomendar validação com advogado, contador ou conselho competente.
- Nunca prometa blindagem jurídica absoluta nem use "100% seguro".
- Se não souber algo com certeza, diga claramente e recomende consultar um especialista.
- Nunca oriente fraude, pejotização irregular, simulação contratual ou burla de vínculo empregatício.
- Nunca trate dados de pacientes — LGPD.

DISCLAIMER OBRIGATÓRIO:
Sempre que a resposta envolver dúvida jurídica, trabalhista, tributária ou regulatória, inclua ao final:
"⚠️ Esta é uma orientação técnica preliminar e não constitui parecer jurídico. Consulte um advogado ou profissional habilitado para seu caso específico."

GUIA DA PLATAFORMA:
- Dashboard: visão geral de contratos, alertas e métricas.
- Contratos: lista, criação (4 etapas: Prestador → Serviço → Remuneração → Revisão), detalhe e assinatura.
- Prestadores: cadastro de profissionais PJ, MEI e PF com CNPJ/CPF lookup automático.
- Templates: modelos pré-configurados por profissão para agilizar novos contratos.
- Compliance: alertas de contratos vencendo, assinaturas pendentes e registros de conselho.
- Relatórios: exportação e visão consolidada de contratos.
- Configurações: dados da clínica, logo, dados bancários e perfil do usuário.

FLUXO DE NOVO CONTRATO:
Etapa 1 (Prestador): tipo de vínculo (PJ/MEI/PF), dados pessoais, profissão, conselho profissional, endereço.
Etapa 2 (Serviço): objeto, descrição dos serviços, local, modalidade, periodicidade, exclusividade, recursos e regras operacionais.
Etapa 3 (Remuneração): modelos (por atendimento, fixo mensal, percentual, pacote…), valores, formas de pagamento, nota fiscal, retenções.
Etapa 4 (Revisão): pré-visualização do contrato, análise pela Mesa Técnica (IA), seleção de anexos (A–J), vigência e salvamento.

BUSCA WEB (quando habilitada):
- Priorize fontes oficiais: governo.br, legislação.gov.br, Planalto, Receita Federal, CFP, CFM, conselhos profissionais.
- Nunca invente fontes — se não encontrar, diga que não foi possível consultar.
- Se a busca falhar, avise: "Não consegui consultar fontes externas agora. Vou responder com orientação geral."`;

// ─── Helpers de SSE ──────────────────────────────────────────────────────────

function sseChunk(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

function sseDone(): Uint8Array {
  return new TextEncoder().encode('data: {"type":"done"}\n\n');
}

function sseError(message: string): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── 1. Autenticação ────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Rate limit ──────────────────────────────────────────────────────
    const rl = checkRateLimit(user.id);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Você atingiu o limite temporário de mensagens do assistente. Tente novamente mais tarde.',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. Parse e validação do payload ───────────────────────────────────
    let body: {
      messages?:    { role: 'user' | 'assistant'; content: string }[];
      pageContext?: string;
      formContext?: string;
    };

    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Payload inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages, pageContext, formContext } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Mensagens obrigatórias' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 4a. Validar estrutura de cada mensagem ────────────────────────────
    const VALID_ROLES = new Set(['user', 'assistant']);
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m || typeof m !== 'object') {
        return new Response(
          JSON.stringify({ error: `Mensagem na posição ${i} é inválida.` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (!VALID_ROLES.has(m.role)) {
        return new Response(
          JSON.stringify({ error: `Mensagem na posição ${i} tem role inválido: "${m.role}". Use "user" ou "assistant".` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (typeof m.content !== 'string') {
        return new Response(
          JSON.stringify({ error: `Mensagem na posição ${i} tem content inválido (esperado string).` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (m.content.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: `Mensagem na posição ${i} tem conteúdo vazio.` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── 4. Validar tamanho da última mensagem do usuário ──────────────────
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg.role === 'user' && lastUserMsg.content.length > MAX_USER_MSG_CHARS) {
      return new Response(
        JSON.stringify({
          error: `Mensagem muito longa. Limite: ${MAX_USER_MSG_CHARS} caracteres. Sua mensagem tem ${lastUserMsg.content.length} caracteres.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 5. Sliding window — limita histórico enviado ao Claude ────────────
    // Garante no máx. MAX_HISTORY_MSGS mensagens, preservando a última (atual)
    const historyToSend = messages.length > MAX_HISTORY_MSGS
      ? messages.slice(messages.length - MAX_HISTORY_MSGS)
      : messages;

    // ── 6. Truncar contextos ───────────────────────────────────────────────
    const safePageCtx = pageContext
      ? pageContext.slice(0, MAX_PAGE_CTX_CHARS)
      : undefined;

    const safeFormCtx = formContext
      ? formContext.slice(0, MAX_FORM_CTX_CHARS)
      : undefined;

    // ── 7. Montar mensagens com contexto injetado na última mensagem ───────
    const previousMsgs = historyToSend.slice(0, -1);
    const currentMsg   = historyToSend[historyToSend.length - 1];

    let contextPrefix = '';
    if (safePageCtx) contextPrefix += `[Contexto da tela: "${safePageCtx}"]\n`;
    if (safeFormCtx) contextPrefix += `[Dados do formulário em andamento:\n${safeFormCtx}\n]\n`;

    const augmentedMsg = contextPrefix
      ? { role: currentMsg.role as 'user' | 'assistant', content: `${contextPrefix}\nPergunta: ${currentMsg.content}` }
      : { role: currentMsg.role as 'user' | 'assistant', content: currentMsg.content };

    const anthropicMessages = [
      ...previousMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      augmentedMsg,
    ];

    // ── 8. Configurar tools (web_search com feature flag) ─────────────────
    const webSearchEnabled = isWebSearchEnabled();
    // Tipagem any[]: o SDK 0.24.3 não inclui tipos beta para web_search_20250305.
    // A ferramenta é suportada pela API mas não refletida no .d.ts desta versão.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: any[] = webSearchEnabled
      ? [{ type: 'web_search_20250305', name: 'web_search', max_uses: WEB_SEARCH_MAX_USES }]
      : [];

    // ── 9. Criar stream SSE ────────────────────────────────────────────────
    const readable = new ReadableStream({
      async start(controller) {
        const enqueue = (chunk: Uint8Array) => {
          try { controller.enqueue(chunk); } catch { /* controller já fechado */ }
        };

        try {
          const createParams: Anthropic.Messages.MessageStreamParams = {
            model:      getModel(),
            max_tokens: 1_500,
            system:     SYSTEM_PROMPT,
            messages:   anthropicMessages as Anthropic.Messages.MessageParam[],
            stream:     true,
          };

          // Adicionar tools apenas se habilitado E se array não vazio
          if (tools.length > 0) {
            (createParams as any).tools = tools;
          }

          const stream = await anthropic.messages.create(createParams);

          // Coleta fontes quando web_search é usado
          const sources: { title: string; url: string }[] = [];
          let textStarted = false;

          for await (const event of stream as AsyncIterable<any>) {
            // ── Texto em streaming ──────────────────────────────────────
            if (event.type === 'content_block_delta') {
              const delta = event.delta as any;
              if (delta?.type === 'text_delta' && typeof delta.text === 'string' && delta.text) {
                textStarted = true;
                enqueue(sseChunk({ type: 'delta', text: delta.text }));
              }
            }

            // ── Captura resultado de busca web (fontes) ─────────────────
            // O resultado de web_search chega como content_block_start com
            // tipo 'tool_result' ou dentro de blocos 'tool_use'/'tool_result'
            if (event.type === 'content_block_start') {
              const block = event.content_block as any;
              if (block?.type === 'tool_result' && Array.isArray(block?.content)) {
                for (const item of block.content) {
                  if (item?.type === 'document' && item?.source?.type === 'url') {
                    sources.push({
                      title: item?.title || item?.source?.url || 'Fonte',
                      url:   item?.source?.url || '',
                    });
                  }
                }
              }
              // Formato alternativo: search_result_block
              if (block?.type === 'search_result_block') {
                if (block?.url) {
                  sources.push({ title: block?.title || block?.url, url: block.url });
                }
              }
            }

            // ── Fim do stream ───────────────────────────────────────────
            if (event.type === 'message_stop') {
              // Enviar fontes se houver (apenas quando busca web foi usada)
              if (webSearchEnabled && sources.length > 0) {
                enqueue(sseChunk({ type: 'sources', sources }));
              }

              // Se nenhum texto foi gerado, enviar mensagem de fallback
              if (!textStarted) {
                enqueue(sseChunk({
                  type: 'delta',
                  text: 'Não consegui obter resposta agora. Tente novamente em instantes.',
                }));
              }

              enqueue(sseDone());
              controller.close();
              return;
            }
          }

          // Segurança: fechar se loop terminar sem message_stop
          if (!textStarted) {
            enqueue(sseChunk({
              type: 'delta',
              text: 'Não consegui obter resposta agora. Tente novamente em instantes.',
            }));
          }
          enqueue(sseDone());
          controller.close();

        } catch (err) {
          const isWebSearchError = webSearchEnabled &&
            err instanceof Error &&
            err.message.toLowerCase().includes('search');

          if (isWebSearchError) {
            // Fallback: responde sem busca web, informa o usuário
            enqueue(sseChunk({
              type: 'delta',
              text: 'Não consegui consultar fontes externas agora. Vou responder com orientação geral com base no contexto do sistema.\n\n',
            }));

            try {
              // Nova tentativa sem tools
              const fallbackStream = await anthropic.messages.create({
                model:      getModel(),
                max_tokens: 1_500,
                system:     SYSTEM_PROMPT,
                messages:   anthropicMessages as Anthropic.Messages.MessageParam[],
                stream:     true,
              });

              for await (const event of fallbackStream as AsyncIterable<any>) {
                if (event.type === 'content_block_delta') {
                  const delta = event.delta as any;
                  if (delta?.type === 'text_delta' && delta.text) {
                    enqueue(sseChunk({ type: 'delta', text: delta.text }));
                  }
                }
                if (event.type === 'message_stop') {
                  enqueue(sseDone());
                  controller.close();
                  return;
                }
              }
            } catch (fallbackErr) {
              const msg = fallbackErr instanceof Error ? fallbackErr.message : 'Erro de conexão';
              enqueue(sseError(msg));
            }
          } else {
            const msg = err instanceof Error ? err.message : 'Erro ao processar';
            enqueue(sseError(msg));
          }

          enqueue(sseDone());
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection':    'keep-alive',
        'X-Accel-Buffering': 'no', // desabilita buffering no Nginx/proxies
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[/api/assistant]', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
