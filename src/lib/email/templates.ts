// ================================================================
// ContractCore — Templates de E-mail HTML
// Visual premium, responsivo, com identidade da clínica
// ================================================================

interface BaseEmailProps {
  companyName:   string;
  companyLogo?:  string | null;
  recipientName: string;
}

// ── CABEÇALHO E RODAPÉ COMPARTILHADOS ────────────────────────────

function emailHeader(companyName: string, logoUrl?: string | null): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2f4e;padding:28px 0">
    <tr>
      <td align="center">
        ${logoUrl
          ? `<img src="${logoUrl}" alt="${companyName}" style="max-height:48px;max-width:160px;object-fit:contain;display:block;margin:0 auto 8px" />`
          : ''
        }
        <div style="color:#d4a843;font-family:Georgia,serif;font-size:20px;font-weight:700;letter-spacing:0.5px">
          ${companyName}
        </div>
        <div style="color:rgba(255,255,255,0.5);font-family:Arial,sans-serif;font-size:11px;margin-top:4px;letter-spacing:1px;text-transform:uppercase">
          ContractCore · Governança Contratual
        </div>
      </td>
    </tr>
  </table>`;
}

function emailFooter(companyName: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px">
    <tr>
      <td align="center">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;line-height:1.6">
          Este e-mail foi enviado automaticamente pelo sistema ContractCore<br>
          em nome de <strong>${companyName}</strong>.<br>
          Em caso de dúvidas, entre em contato diretamente com a clínica.
        </p>
      </td>
    </tr>
  </table>`;
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ContractCore</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── TEMPLATE 1: ENVIO DE CONTRATO ────────────────────────────────

export function emailContratoEnviado(props: BaseEmailProps & {
  numeroContrato: string;
  profissao:      string;
  vigencia:       string;
  instrucoes?:    string;
}): { subject: string; html: string } {
  const { companyName, companyLogo, recipientName, numeroContrato, profissao, vigencia, instrucoes } = props;

  const html = emailWrapper(`
    ${emailHeader(companyName, companyLogo)}

    <tr><td style="padding:40px 40px 24px">
      <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#0f2f4e;font-weight:700">
        Contrato disponível para assinatura
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
        Olá, <strong>${recipientName}</strong>. Um contrato foi preparado para você.
      </p>

      <!-- Card do contrato -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6ff;border:1.5px solid #dce8f5;border-top:3px solid #0f2f4e;border-radius:10px;margin-bottom:24px">
        <tr><td style="padding:20px 24px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding-bottom:12px">
                <div style="font-size:10px;color:#1a5585;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:4px">Número do Contrato</div>
                <div style="font-size:15px;color:#0f2f4e;font-weight:700">${numeroContrato}</div>
              </td>
              <td width="50%" style="padding-bottom:12px">
                <div style="font-size:10px;color:#1a5585;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:4px">Profissão</div>
                <div style="font-size:15px;color:#0f2f4e;font-weight:700">${profissao}</div>
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <div style="font-size:10px;color:#1a5585;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:4px">Vigência</div>
                <div style="font-size:14px;color:#334155">${vigencia}</div>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      ${instrucoes ? `
      <!-- Instruções -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e6;border:1px solid #f0d080;border-radius:8px;margin-bottom:24px">
        <tr><td style="padding:16px 20px">
          <div style="font-size:12px;color:#92640a;font-weight:700;margin-bottom:6px">📋 Instruções</div>
          <div style="font-size:13px;color:#78500a;line-height:1.6">${instrucoes}</div>
        </td></tr>
      </table>` : ''}

      <!-- Como assinar -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:32px">
        <tr><td style="padding:16px 20px;border-bottom:1px solid #f1f5f9">
          <div style="font-size:12px;color:#475569;font-weight:700;margin-bottom:8px">✍️ Como assinar digitalmente (grátis)</div>
          <ol style="margin:0;padding-left:18px;font-size:12px;color:#64748b;line-height:1.8">
            <li>Acesse <a href="https://assinador.iti.br" style="color:#1a5585">assinador.iti.br</a></li>
            <li>Entre com sua conta GOV.BR (nível Prata ou Ouro)</li>
            <li>Faça upload do PDF do contrato anexo</li>
            <li>Assine e encaminhe a versão assinada para <strong>${companyName}</strong></li>
          </ol>
        </td></tr>
      </table>

      <p style="margin:0;font-size:13px;color:#475569;line-height:1.6">
        Caso tenha dúvidas sobre o conteúdo do contrato, entre em contato com ${companyName} antes de assinar.
      </p>
    </td></tr>

    ${emailFooter(companyName)}
  `);

  return {
    subject: `[${companyName}] Contrato ${numeroContrato} disponível para assinatura`,
    html,
  };
}

// ── TEMPLATE 2: ALERTA DE CONTRATO VENCENDO ──────────────────────

export function emailContratoVencendo(props: BaseEmailProps & {
  numeroContrato:  string;
  prestadorNome:   string;
  dataVencimento:  string;
  diasRestantes:   number;
  linkContrato?:   string;
}): { subject: string; html: string } {
  const { companyName, companyLogo, recipientName, numeroContrato, prestadorNome, dataVencimento, diasRestantes, linkContrato } = props;

  const urgenciaColor = diasRestantes <= 7 ? '#dc2626' : diasRestantes <= 15 ? '#d97706' : '#2563eb';
  const urgenciaLabel = diasRestantes <= 7 ? '🚨 URGENTE' : diasRestantes <= 15 ? '⚠️ ATENÇÃO' : 'ℹ️ AVISO';

  const html = emailWrapper(`
    ${emailHeader(companyName, companyLogo)}

    <tr><td style="padding:40px 40px 24px">
      <!-- Badge de urgência -->
      <div style="display:inline-block;background:${urgenciaColor};color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:16px;letter-spacing:0.5px">
        ${urgenciaLabel} — ${diasRestantes} dia(s) restante(s)
      </div>

      <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#0f2f4e;font-weight:700">
        Contrato próximo do vencimento
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
        Olá, <strong>${recipientName}</strong>. O contrato abaixo está próximo da data de término.
      </p>

      <!-- Card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1.5px solid #fecaca;border-top:3px solid ${urgenciaColor};border-radius:10px;margin-bottom:24px">
        <tr><td style="padding:20px 24px">
          <table width="100%" cellpadding="8">
            <tr>
              <td><div style="font-size:10px;color:#991b1b;text-transform:uppercase;letter-spacing:1px;font-weight:700">Contrato</div><div style="font-size:14px;color:#1e293b;font-weight:700">${numeroContrato}</div></td>
              <td><div style="font-size:10px;color:#991b1b;text-transform:uppercase;letter-spacing:1px;font-weight:700">Prestador</div><div style="font-size:14px;color:#1e293b;font-weight:700">${prestadorNome}</div></td>
            </tr>
            <tr>
              <td colspan="2"><div style="font-size:10px;color:#991b1b;text-transform:uppercase;letter-spacing:1px;font-weight:700">Data de Vencimento</div><div style="font-size:18px;color:${urgenciaColor};font-weight:700">${dataVencimento}</div></td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- Ações -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px">
        <tr><td style="padding:16px 20px">
          <div style="font-size:12px;color:#475569;font-weight:700;margin-bottom:10px">O que você pode fazer:</div>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:12px;color:#64748b">✅ Renovar o contrato com os mesmos dados</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#64748b">📝 Criar novo contrato com condições atualizadas</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#64748b">⛔ Encerrar o contrato se a prestação foi concluída</td></tr>
          </table>
        </td></tr>
      </table>

      ${linkContrato ? `
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#0f2f4e;border-radius:8px;padding:12px 28px">
            <a href="${linkContrato}" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">
              Acessar contrato →
            </a>
          </td>
        </tr>
      </table>` : ''}
    </td></tr>

    ${emailFooter(companyName)}
  `);

  return {
    subject: `[ContractCore] ${urgenciaLabel} — Contrato ${numeroContrato} vence em ${diasRestantes} dia(s)`,
    html,
  };
}

// ── TEMPLATE 3: ASSINATURA REGISTRADA ────────────────────────────

export function emailAssinaturaRegistrada(props: BaseEmailProps & {
  numeroContrato: string;
  quemAssinou:    string;
  ambosAssinaram: boolean;
  dataAssinatura: string;
}): { subject: string; html: string } {
  const { companyName, companyLogo, recipientName, numeroContrato, quemAssinou, ambosAssinaram, dataAssinatura } = props;

  const html = emailWrapper(`
    ${emailHeader(companyName, companyLogo)}

    <tr><td style="padding:40px 40px 24px">
      <!-- Ícone de sucesso -->
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-block;width:64px;height:64px;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:50%;line-height:64px;font-size:28px">
          ✅
        </div>
      </div>

      <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#0f2f4e;font-weight:700;text-align:center">
        ${ambosAssinaram ? 'Contrato assinado por ambas as partes!' : 'Assinatura registrada'}
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;text-align:center">
        Olá, <strong>${recipientName}</strong>.
        ${ambosAssinaram
          ? ' O contrato foi assinado pelas duas partes e está agora em vigor.'
          : ` A assinatura de <strong>${quemAssinou}</strong> foi registrada. Aguardando a outra parte.`
        }
      </p>

      <!-- Card de status -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-top:3px solid #16a34a;border-radius:10px;margin-bottom:24px">
        <tr><td style="padding:20px 24px">
          <table width="100%">
            <tr>
              <td><div style="font-size:10px;color:#15803d;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:4px">Contrato</div><div style="font-size:15px;color:#0f2f4e;font-weight:700">${numeroContrato}</div></td>
              <td><div style="font-size:10px;color:#15803d;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:4px">Data</div><div style="font-size:15px;color:#0f2f4e;font-weight:700">${dataAssinatura}</div></td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:12px">
                <div style="font-size:10px;color:#15803d;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:4px">Status</div>
                <div style="font-size:14px;color:#15803d;font-weight:700">
                  ${ambosAssinaram ? '✅ Assinado por ambas as partes — em vigor' : `⏳ Assinado por ${quemAssinou} — aguardando outra parte`}
                </div>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      ${ambosAssinaram ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e6;border:1px solid #f0d080;border-radius:8px">
        <tr><td style="padding:16px 20px">
          <div style="font-size:12px;color:#92640a;font-weight:700;margin-bottom:6px">📁 Importante — Guarde o documento</div>
          <div style="font-size:12px;color:#78500a;line-height:1.6">
            Guarde o PDF assinado digitalmente em local seguro. Recomendamos mantê-lo por pelo menos 10 anos, conforme prazo prescricional de contratos civis.
          </div>
        </td></tr>
      </table>` : ''}
    </td></tr>

    ${emailFooter(companyName)}
  `);

  return {
    subject: ambosAssinaram
      ? `[ContractCore] ✅ Contrato ${numeroContrato} assinado por ambas as partes`
      : `[ContractCore] Assinatura registrada — Contrato ${numeroContrato}`,
    html,
  };
}

// ── TEMPLATE 4: CONTRATO RENOVADO ────────────────────────────────

export function emailContratoRenovado(props: BaseEmailProps & {
  numeroContratoNovo:    string;
  numeroContratoOriginal: string;
  prestadorNome:         string;
  novaVigencia:          string;
}): { subject: string; html: string } {
  const { companyName, companyLogo, recipientName, numeroContratoNovo, numeroContratoOriginal, prestadorNome, novaVigencia } = props;

  const html = emailWrapper(`
    ${emailHeader(companyName, companyLogo)}

    <tr><td style="padding:40px 40px 24px">
      <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#0f2f4e;font-weight:700">
        Contrato renovado com sucesso
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
        Olá, <strong>${recipientName}</strong>. O contrato foi renovado automaticamente.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6ff;border:1.5px solid #dce8f5;border-top:3px solid #0f2f4e;border-radius:10px;margin-bottom:24px">
        <tr><td style="padding:20px 24px">
          <table width="100%" cellpadding="8">
            <tr>
              <td><div style="font-size:10px;color:#1a5585;text-transform:uppercase;letter-spacing:1px;font-weight:700">Novo Contrato</div><div style="font-size:15px;color:#0f2f4e;font-weight:700">${numeroContratoNovo}</div></td>
              <td><div style="font-size:10px;color:#1a5585;text-transform:uppercase;letter-spacing:1px;font-weight:700">Substituiu</div><div style="font-size:14px;color:#64748b">${numeroContratoOriginal}</div></td>
            </tr>
            <tr>
              <td><div style="font-size:10px;color:#1a5585;text-transform:uppercase;letter-spacing:1px;font-weight:700">Prestador</div><div style="font-size:14px;color:#1e293b;font-weight:600">${prestadorNome}</div></td>
              <td><div style="font-size:10px;color:#1a5585;text-transform:uppercase;letter-spacing:1px;font-weight:700">Nova Vigência</div><div style="font-size:14px;color:#1e293b;font-weight:600">${novaVigencia}</div></td>
            </tr>
          </table>
        </td></tr>
      </table>

      <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0">
        O novo contrato foi criado como rascunho e precisa ser revisado e assinado pelas partes antes de entrar em vigor.
      </p>
    </td></tr>

    ${emailFooter(companyName)}
  `);

  return {
    subject: `[ContractCore] Contrato renovado — ${numeroContratoNovo} (${prestadorNome})`,
    html,
  };
}
