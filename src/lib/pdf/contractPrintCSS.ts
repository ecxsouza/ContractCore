// CSS compartilhado para impressão — usado pelo Step4Review e ContractDetailClient
// Garante que o contrato impresso seja idêntico ao preview
export function getContractPrintCSS(logoUrl?: string | null, companyName?: string): string {
  return `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}

  @page{
    size:A4;
    margin:2.2cm 2.4cm 2.8cm 2.4cm;
    @bottom-center{
      content:"Página " counter(page) " de " counter(pages);
      font-family:'Inter',sans-serif;font-size:7pt;color:#94a3b8;
    }
  }
  body{
    font-family:'Inter',system-ui,sans-serif;
    font-size:9.5pt;color:#1e293b;background:#fff;
    line-height:1.78;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }

  /* LOGO */
  .doc-logo{text-align:center;margin-bottom:18px;padding-top:8px}
  .doc-logo img{max-height:56px;max-width:180px;object-fit:contain}
  .doc-logo-text{
    text-align:center;font-family:'Playfair Display',serif;
    font-size:13pt;font-weight:700;color:#0f2f4e;
    margin-bottom:18px;letter-spacing:.5px;padding-top:8px;
  }

  /* CABEÇALHO */
  h1.contract-title{
    font-family:'Playfair Display',Georgia,serif;
    text-align:center;font-size:16pt;font-weight:700;
    color:#0f2f4e;letter-spacing:.3px;margin-bottom:4px;
  }
  .contract-meta{
    text-align:center;font-size:7.5pt;color:#64748b;
    letter-spacing:.8px;text-transform:uppercase;
    margin-bottom:24px;padding-bottom:14px;
    border-bottom:2px solid #d4a843;
  }

  /* PARTES — DOIS CARDS */
  .partes-grid{
    display:grid;grid-template-columns:1fr 1fr;
    gap:12px;margin-bottom:12px;
  }
  .parte-card{
    border:1.5px solid #dce8f5;border-top:3px solid #0f2f4e;
    border-radius:8px;padding:11px 13px;background:#f7fafd;
  }
  .parte-label{
    font-size:6pt;font-weight:700;text-transform:uppercase;
    letter-spacing:1.8px;color:#1a5585;margin-bottom:5px;
  }
  .parte-nome{font-size:9.5pt;font-weight:700;color:#0f2f4e;margin-bottom:3px}
  .parte-info{font-size:7.5pt;color:#475569;line-height:1.55;margin-bottom:1.5px}
  .parte-rep{
    font-size:7.5pt;color:#334155;margin-top:6px;
    padding-top:5px;border-top:1px dashed #d1dce8;
  }
  .partes-intro{
    font-size:9pt;color:#475569;font-style:italic;
    text-align:justify;margin-top:8px;line-height:1.7;
    padding:8px 12px;background:#f8fafc;
    border-left:3px solid #d4a843;border-radius:0 4px 4px 0;
  }

  /* CLÁUSULAS — cabeçalho com fundo sutil, sem o header escuro */
  section{margin-bottom:14px}
  h2{
    font-family:'Inter',sans-serif;font-size:7.5pt;font-weight:700;
    text-transform:uppercase;letter-spacing:1.5px;
    color:#1a5585;
    background:#eef4fb;
    border-left:3px solid #1a5585;
    padding:5px 10px;margin-bottom:8px;border-radius:0 4px 4px 0;
    page-break-after:avoid;
  }
  .clausula{padding-left:13px;border-left:2px solid #dce8f5}
  .clausula p{
    margin-bottom:6px;text-align:justify;
    font-size:9.5pt;line-height:1.78;color:#1e293b;
  }
  .clausula p strong{color:#0f2f4e;font-weight:600}
  .clausula p{orphans:3;widows:3}

  /* ANEXOS */
  .anexo-section{page-break-before:always;padding-top:28px}
  .anexo-section h2{
    background:#fff8e6;border-left-color:#d4a843;color:#92640a;
  }

  /* ASSINATURAS */
  .signature-section{
    margin-top:40px;padding-top:20px;
    border-top:1.5px solid #e2e8f0;page-break-inside:avoid;
  }
  .sig-city{font-size:9pt;color:#475569;font-style:italic;margin-bottom:28px}
  .signatures-grid{
    display:grid;grid-template-columns:1fr 1fr;gap:20px;
  }
  .signature-block{
    text-align:center;background:#f8fafc;
    border:1.5px solid #e2e8f0;border-radius:10px;
    padding:18px 14px 14px;
  }
  .signature-space{height:84px;border-bottom:1.5px dashed #94a3b8;margin-bottom:10px}
  .signature-line{display:none}
  .signature-block p{font-size:8pt;line-height:1.6;color:#334155}
  .signature-block p strong{color:#0f2f4e;font-size:8.5pt}
  .signature-block p em{
    display:inline-block;margin-top:3px;font-size:7pt;
    color:#64748b;font-style:normal;text-transform:uppercase;
    letter-spacing:.8px;background:#e8f0f8;padding:2px 7px;border-radius:20px;
  }

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    /* NÃO usar page-break-inside:avoid em section — reserva página toda */
    /* Usar apenas em blocos pequenos que NUNCA ultrapassam uma página */
    .signature-section{page-break-inside:avoid}
    .partes-grid{page-break-inside:avoid}
  }
  `;
}

export function getContractPrintHeader(logoUrl?: string | null, companyName?: string): string {
  if (logoUrl) {
    return `<div class="doc-logo"><img src="${logoUrl}" alt="${companyName || ''}" /></div>`;
  }
  if (companyName) {
    return `<div class="doc-logo-text">${companyName}</div>`;
  }
  return '';
}
