export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { onlyDigits } from '@/lib/masks';

// GET /api/cep?cep=02720200
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cep = onlyDigits(searchParams.get('cep') || '');

  if (cep.length !== 8) {
    return NextResponse.json({ error: 'CEP inválido' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      next: { revalidate: 86400 }, // cache 24h
    });
    const data = await response.json();

    if (data.erro) {
      return NextResponse.json({ error: 'CEP não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      cep:         data.cep?.replace('-', '') || '',
      logradouro:  data.logradouro || '',
      complemento: data.complemento || '',
      bairro:      data.bairro || '',
      localidade:  data.localidade || '',
      uf:          data.uf || '',
    });
  } catch {
    return NextResponse.json({ error: 'Erro na consulta do CEP' }, { status: 500 });
  }
}
