export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

// Wrapper tipado para renderToBuffer — evita "as any" espalhado
// renderToBuffer do @react-pdf/renderer aceita React.ReactElement mas
// suas tipagens são incompatíveis com @types/react em Next.js 14.
// A solução limpa é isolar o cast nesta única função.
async function renderContractPDF(
  contract: Record<string, unknown>,
  company:  Record<string, unknown>,
  provider: Record<string, unknown>
): Promise<Uint8Array> {
  // Imports dinâmicos para evitar erros de SSR
  const [{ default: React }, { renderToBuffer }, { ContractPDF }] = await Promise.all([
    import('react'),
    import('@react-pdf/renderer'),
    import('@/components/pdf/ContractPDF'),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = (ContractPDF as any) as React.ComponentType<{
    contract: Record<string, unknown>;
    company:  Record<string, unknown>;
    provider: Record<string, unknown>;
  }>;

  const element = React.createElement(pdf, {
    contract: {
      ...contract,
      service_details: contract.service_details ?? {},
      remuneration:    contract.remuneration    ?? {},
    },
    company,
    provider,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await (renderToBuffer as any)(element) as Buffer;
  return new Uint8Array(buffer);
}

// ── GET: download direto do PDF ───────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const contractId = new URL(request.url).searchParams.get('id');
    if (!contractId) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const { data: company } = await supabase
      .from('companies').select('*').eq('user_id', user.id).single();
    if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

    const { data: contract } = await supabase
      .from('contracts').select('*, service_providers (*)')
      .eq('id', contractId).eq('company_id', company.id).single();
    if (!contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });

    // Usar versão aprovada se existir, senão o HTML atual
    const htmlParaPDF = (contract.contrato_revisado_ia as string | null)
      ?? (contract.contrato_html as string | null)
      ?? '';

    const contractParaPDF = { ...contract, contrato_html: htmlParaPDF };

    const bytes = await renderContractPDF(
      contractParaPDF as Record<string, unknown>,
      company        as Record<string, unknown>,
      ((contract.service_providers ?? {}) as Record<string, unknown>)
    );

    try {
      await supabase.from('audit_logs').insert({
        company_id:  company.id,
        user_id:     user.id,
        acao:        'contract.pdf_downloaded',
        tabela:      'contracts',
        registro_id: contractId,
      });
    } catch (_) { /* silencioso */ }

    return new NextResponse(Buffer.from(bytes), {
      status:  200,
      headers: {
        'Content-Type':           'application/pdf',
        'Content-Disposition':    `attachment; filename="${contract.numero_contrato as string}.pdf"`,
        'Content-Length':         String(bytes.byteLength),
        'Cache-Control':          'no-store, no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (err) {
    console.error('[/api/pdf GET]', err);
    return NextResponse.json({ error: 'Erro ao gerar PDF.' }, { status: 500 });
  }
}

// ── POST: gera PDF e salva no Storage ────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const contractId = new URL(request.url).searchParams.get('id');
    if (!contractId) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const { data: company } = await supabase
      .from('companies').select('*').eq('user_id', user.id).single();
    if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

    const { data: contract } = await supabase
      .from('contracts').select('*, service_providers (*)')
      .eq('id', contractId).eq('company_id', company.id).single();
    if (!contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });

    const htmlParaPDF = (contract.contrato_revisado_ia as string | null)
      ?? (contract.contrato_html as string | null)
      ?? '';

    const contractParaPDF = { ...contract, contrato_html: htmlParaPDF };

    const bytes = await renderContractPDF(
      contractParaPDF as Record<string, unknown>,
      company        as Record<string, unknown>,
      ((contract.service_providers ?? {}) as Record<string, unknown>)
    );

    // Path padronizado: {user_id}/{company_id}/contracts/{numero}.pdf
    const fileName = `${user.id}/${company.id as string}/contracts/${(contract.numero_contrato as string).replace(/[^a-zA-Z0-9-]/g, '_')}_v${contract.versao as number}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('contract-pdfs')
      .upload(fileName, bytes, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);

    const { data: urlData } = await supabase.storage
      .from('contract-pdfs')
      .createSignedUrl(fileName, 3600);

    const pdfUrl = urlData?.signedUrl ?? '';
    await supabase.from('contracts').update({ pdf_url: pdfUrl }).eq('id', contractId);

    try {
      await supabase.from('audit_logs').insert({
        company_id:  company.id,
        user_id:     user.id,
        acao:        'contract.pdf_generated',
        tabela:      'contracts',
        registro_id: contractId,
      });
    } catch (_) { /* silencioso */ }

    return NextResponse.json({ pdf_url: pdfUrl });

  } catch (err) {
    console.error('[/api/pdf POST]', err);
    return NextResponse.json({ error: 'Erro ao gerar PDF.' }, { status: 500 });
  }
}
