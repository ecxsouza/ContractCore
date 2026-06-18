export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { onlyDigits } from '@/lib/masks';

// ================================================================
// GET /api/cnpj?cnpj=00000000000000
// Consulta dados do CNPJ em API pública (ReceitaWS)
// Proxy server-side para evitar CORS no frontend
// ================================================================

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cnpj = onlyDigits(searchParams.get('cnpj') || '');

    if (cnpj.length !== 14) {
      return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 });
    }

    // Consultar ReceitaWS (gratuito, sem key necessária)
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }, // cache 1 hora
    });

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Muitas consultas. Aguarde um momento e tente novamente.' },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: 'CNPJ não encontrado' }, { status: 404 });
    }

    const data = await response.json();

    if (data.status === 'ERROR') {
      return NextResponse.json({ error: data.message || 'CNPJ não encontrado' }, { status: 404 });
    }

    // Normalizar resposta
    return NextResponse.json({
      razao_social:       data.nome || '',
      nome_fantasia:      data.fantasia || '',
      cnpj:               cnpj,
      situacao_cadastral: data.situacao || '',
      data_abertura:      data.abertura || '',
      porte:              data.porte || '',
      natureza_juridica:  data.natureza_juridica || '',
      atividade_principal: data.atividade_principal?.[0]?.text || '',
      logradouro:         data.logradouro || '',
      numero:             data.numero || '',
      complemento:        data.complemento || '',
      bairro:             data.bairro || '',
      municipio:          data.municipio || '',
      uf:                 data.uf || '',
      cep:                onlyDigits(data.cep || ''),
      email:              data.email || '',
      telefone:           data.telefone || '',
    });

  } catch (err) {
    console.error('[/api/cnpj] Erro:', err);
    return NextResponse.json({ error: 'Erro na consulta do CNPJ' }, { status: 500 });
  }
}
