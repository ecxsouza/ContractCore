// ================================================================
// ContractCore — CSS de Impressão dos Termos de Pacientes
// Arquivo isolado — não importa nem altera contractPrintCSS.ts
// Compatível com impressão via browser (window.print()) em A4
// ================================================================

export const patientTermPrintCSS = `
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

/* LOGO / CABEÇALHO INSTITUCIONAL */
.pt-logo{text-align:center;margin-bottom:16px;padding-top:8px}
.pt-logo img{max-height:52px;max-width:160px;object-fit:contain}
.pt-logo-text{
  text-align:center;font-family:'Playfair Display',serif;
  font-size:12pt;font-weight:700;color:#0f2f4e;
  margin-bottom:16px;letter-spacing:.5px;padding-top:8px;
}

/* TÍTULO DO TERMO */
h1.pt-title{
  font-family:'Playfair Display',Georgia,serif;
  text-align:center;font-size:15pt;font-weight:700;
  color:#0f2f4e;letter-spacing:.3px;margin-bottom:4px;
}
.pt-meta{
  text-align:center;font-size:7.5pt;color:#64748b;
  letter-spacing:.8px;text-transform:uppercase;
  margin-bottom:22px;padding-bottom:12px;
  border-bottom:2px solid #16a34a;
}

/* CARDS DE PARTES */
.pt-partes-grid{
  display:grid;grid-template-columns:1fr 1fr;
  gap:12px;margin-bottom:12px;
}
.pt-parte-card{
  border:1.5px solid #d1fae5;border-top:3px solid #0f2f4e;
  border-radius:8px;padding:11px 13px;background:#f0fdf4;
}
.pt-parte-label{
  font-size:6pt;font-weight:700;text-transform:uppercase;
  letter-spacing:1.8px;color:#166534;margin-bottom:5px;
}
.pt-parte-nome{font-size:9.5pt;font-weight:700;color:#0f2f4e;margin-bottom:3px}
.pt-parte-info{font-size:7.5pt;color:#475569;line-height:1.55;margin-bottom:1.5px}

/* CARD ÚNICO (paciente adulto sem responsável separado) */
.pt-partes-single{margin-bottom:12px}
.pt-partes-single .pt-parte-card{grid-template-columns:1fr}

/* BLOCO RESPONSÁVEL */
.pt-responsavel-grid{
  display:grid;grid-template-columns:1fr 1fr;
  gap:12px;margin-bottom:12px;
}
.pt-responsavel-card{
  border:1.5px solid #dbeafe;border-top:3px solid #1d4ed8;
  border-radius:8px;padding:10px 13px;background:#eff6ff;
}
.pt-responsavel-label{
  font-size:6pt;font-weight:700;text-transform:uppercase;
  letter-spacing:1.8px;color:#1d4ed8;margin-bottom:4px;
}

/* SEÇÕES E CLÁUSULAS */
section.pt-section{margin-bottom:14px}
h2.pt-section-title{
  font-family:'Inter',sans-serif;font-size:7.5pt;font-weight:700;
  text-transform:uppercase;letter-spacing:1.5px;
  color:#166534;
  background:#f0fdf4;
  border-left:3px solid #16a34a;
  padding:5px 10px;margin-bottom:8px;border-radius:0 4px 4px 0;
  page-break-after:avoid;
}
.pt-clausula{padding-left:13px;border-left:2px solid #d1fae5}
.pt-clausula p{
  margin-bottom:6px;text-align:justify;
  font-size:9.5pt;line-height:1.78;color:#1e293b;
}
.pt-clausula p strong{color:#0f2f4e;font-weight:600}
.pt-clausula p{orphans:3;widows:3}

/* BLOCO DE CONSENTIMENTOS */
.pt-consent-block{
  background:#fefce8;border:1.5px solid #fde047;
  border-radius:8px;padding:14px 16px;margin:12px 0;
  page-break-inside:avoid;
}
.pt-consent-title{
  font-size:7.5pt;font-weight:700;text-transform:uppercase;
  letter-spacing:1.2px;color:#854d0e;margin-bottom:10px;
}
.pt-consent-item{
  display:flex;align-items:flex-start;gap:8px;
  margin-bottom:8px;
}
.pt-consent-check{
  width:14px;height:14px;border:1.5px solid #a16207;
  border-radius:3px;margin-top:1px;flex-shrink:0;
  background:#fff;
}
.pt-consent-text{font-size:9pt;color:#1e293b;line-height:1.6}

/* ASSINATURAS */
.pt-signature-section{
  margin-top:36px;padding-top:18px;
  border-top:1.5px solid #e2e8f0;page-break-inside:avoid;
}
.pt-sig-city{font-size:9pt;color:#475569;font-style:italic;margin-bottom:24px}
.pt-signatures-grid{
  display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;
}
.pt-signatures-grid-1{
  display:grid;grid-template-columns:1fr;gap:20px;max-width:340px;
}
.pt-signature-block{
  text-align:center;background:#f8fafc;
  border:1.5px solid #e2e8f0;border-radius:10px;
  padding:18px 14px 14px;
}
.pt-signature-space{height:72px;border-bottom:1.5px dashed #94a3b8;margin-bottom:10px}
.pt-signature-block p{font-size:8pt;line-height:1.6;color:#334155}
.pt-signature-block p strong{color:#0f2f4e;font-size:8.5pt}
.pt-signature-block p em{
  display:inline-block;margin-top:3px;font-size:7pt;
  color:#64748b;font-style:normal;text-transform:uppercase;
  letter-spacing:.8px;background:#e8f0f8;padding:2px 7px;border-radius:20px;
}

/* AVISO NÃO-CLÍNICO */
.pt-aviso-admin{
  background:#f0f9ff;border:1px solid #bae6fd;
  border-radius:6px;padding:10px 14px;
  font-size:8pt;color:#0c4a6e;line-height:1.6;
  margin:8px 0;
}

/* NÚMERO DO TERMO */
.pt-numero{
  display:inline-block;background:#f0fdf4;
  border:1px solid #86efac;border-radius:4px;
  padding:2px 8px;font-size:7.5pt;font-weight:600;
  color:#166534;letter-spacing:.5px;
}

@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pt-signature-section{page-break-inside:avoid}
  .pt-partes-grid{page-break-inside:avoid}
  .pt-responsavel-grid{page-break-inside:avoid}
  .pt-consent-block{page-break-inside:avoid}
}
`;
