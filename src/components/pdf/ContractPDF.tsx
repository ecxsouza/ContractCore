// ================================================================
// ContractCore — PDF Premium com @react-pdf/renderer
// Visual: Capa + Resumo Executivo + Corpo + Assinaturas + Anexos
// ================================================================
import React from 'react';
import {
  Document, Page, Text, View, StyleSheet,
  Font, Image, Link as PDFLink,
} from '@react-pdf/renderer';
import type { Contract, Company, ServiceProvider } from '@/types';
import { formatDateBR, formatDateLong } from '@/lib/masks';

// ── PALETA CONTRACTCORE ──────────────────────────────────────────
const C = {
  azulPetroleo:      '#0f2f4e',
  azulInstitucional: '#1a5585',
  azulMedio:         '#2c6fa0',
  azulClaro:         '#e8f0f8',
  dourado:           '#d4a843',
  douradoClaro:      '#f5e8c4',
  grafite:           '#334155',
  cinzaTexto:        '#475569',
  cinzaLinha:        '#e2e8f0',
  branco:            '#ffffff',
  preto:             '#0a1a2e',
};

const styles = StyleSheet.create({
  // ── DOCUMENTO ─────────────────────────────────────────────────
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.preto,
    backgroundColor: C.branco,
    paddingTop: 56,
    paddingBottom: 56,
    paddingLeft: 56,
    paddingRight: 56,
  },

  // ── CAPA ──────────────────────────────────────────────────────
  coverPage: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    backgroundColor: C.azulPetroleo,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    flexDirection: 'column',
  },
  coverTop: {
    flex: 1,
    backgroundColor: C.azulPetroleo,
    padding: 56,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverDot: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  coverBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginBottom: 48,
  },
  coverBadgeText: { color: 'rgba(255,255,255,0.7)', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase' },
  coverTitle: { color: C.branco, fontSize: 26, fontFamily: 'Helvetica-Bold', lineHeight: 1.3, marginBottom: 8 },
  coverSubtitle: { color: C.dourado, fontSize: 13, marginBottom: 32 },
  coverDivider: { height: 2, backgroundColor: C.dourado, width: 48, marginBottom: 24 },
  coverMeta: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 16,
  },
  coverMetaItem: { marginRight: 24, marginBottom: 8 },
  coverMetaLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 7, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 },
  coverMetaValue: { color: C.branco, fontSize: 10, fontFamily: 'Helvetica-Bold' },
  coverBottom: {
    backgroundColor: C.azulInstitucional,
    padding: 24,
    paddingHorizontal: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coverBottomText: { color: 'rgba(255,255,255,0.5)', fontSize: 7 },
  coverLogoArea: {
    width: 80, height: 40, justifyContent: 'center', alignItems: 'flex-end',
  },

  // ── CABEÇALHO ─────────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: C.cinzaLinha, paddingBottom: 10, marginBottom: 20,
  },
  headerLeft:  { flex: 1 },
  headerCompany: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.azulPetroleo },
  headerDoc: { fontSize: 7, color: C.cinzaTexto, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerNum:   { fontSize: 7, color: C.azulMedio, fontFamily: 'Helvetica-Bold' },
  headerLogo:  { width: 60, height: 24, objectFit: 'contain' },

  // ── RODAPÉ ────────────────────────────────────────────────────
  footer: {
    position: 'absolute', bottom: 24, left: 56, right: 56,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.cinzaLinha, paddingTop: 8,
  },
  footerText: { fontSize: 6.5, color: C.cinzaTexto },
  footerNum:  { fontSize: 6.5, color: C.azulMedio, fontFamily: 'Helvetica-Bold' },

  // ── RESUMO EXECUTIVO ──────────────────────────────────────────
  execTitle: {
    fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.azulPetroleo,
    marginBottom: 4,
  },
  execSubtitle: { fontSize: 8, color: C.cinzaTexto, marginBottom: 20 },
  execGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  execCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: C.azulClaro, borderRadius: 8,
    padding: 12, marginBottom: 6,
    borderLeftWidth: 3, borderLeftColor: C.azulMedio,
  },
  execCardLabel: { fontSize: 6.5, color: C.azulMedio, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  execCardValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.azulPetroleo, lineHeight: 1.4 },

  // ── CORPO DO CONTRATO ─────────────────────────────────────────
  sectionTitle: {
    fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.azulInstitucional,
    textTransform: 'uppercase', letterSpacing: 0.8,
    borderBottomWidth: 1, borderBottomColor: C.azulClaro,
    paddingBottom: 4, marginBottom: 8, marginTop: 14,
  },
  clausulaText: {
    fontSize: 8.5, color: C.grafite, lineHeight: 1.65,
    textAlign: 'justify', marginBottom: 5,
  },
  clausulaHighlight: {
    fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.azulPetroleo,
  },

  // ── ASSINATURAS ───────────────────────────────────────────────
  sigGrid: { flexDirection: 'row', gap: 16, marginTop: 32 },
  sigBlock: { flex: 1, alignItems: 'center' },
  sigLine:  { width: '100%', height: 0.5, backgroundColor: C.azulPetroleo, marginBottom: 6 },
  sigName:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.azulPetroleo, textAlign: 'center' },
  sigRole:  { fontSize: 7, color: C.cinzaTexto, textAlign: 'center', marginTop: 2 },
  sigDate:  { fontSize: 7, color: C.cinzaTexto, textAlign: 'center', marginTop: 4 },

  // ── ANEXO ─────────────────────────────────────────────────────
  anexoHeader: {
    backgroundColor: C.azulPetroleo, padding: 16, borderRadius: 6,
    marginBottom: 16,
  },
  anexoHeaderLabel: { color: C.dourado, fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  anexoHeaderTitle: { color: C.branco, fontSize: 13, fontFamily: 'Helvetica-Bold' },
  anexoText: { fontSize: 8.5, color: C.grafite, lineHeight: 1.65, textAlign: 'justify', marginBottom: 6 },
});

// ── COMPONENTES INTERNOS ─────────────────────────────────────────

const Header = ({ company, numeroContrato, versao }: {
  company: Company; numeroContrato: string; versao: number;
}) => (
  <View style={styles.header} fixed>
    <View style={styles.headerLeft}>
      {company.logo_url ? (
        <Image src={company.logo_url} style={styles.headerLogo} />
      ) : (
        <Text style={styles.headerCompany}>{company.nome_fantasia}</Text>
      )}
      <Text style={styles.headerDoc}>ContractCore — Governança Contratual</Text>
    </View>
    <View style={styles.headerRight}>
      <Text style={styles.headerNum}>{numeroContrato} · v{versao}</Text>
    </View>
  </View>
);

const Footer = ({ city, uf, pageNum }: { city: string; uf: string; pageNum?: string }) => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerText}>
      Documento gerado pelo ContractCore · {city}/{uf} · Confidencial
    </Text>
    <Text style={styles.footerNum} render={({ pageNumber, totalPages }) =>
      `Pág. ${pageNumber} / ${totalPages}`
    } />
  </View>
);

// ── DOCUMENTO PRINCIPAL ──────────────────────────────────────────

interface ContractPDFProps {
  contract: Contract;
  company:  Company;
  provider: ServiceProvider;
}

export function ContractPDF({ contract, company, provider }: ContractPDFProps) {
  const service    = contract.service_details;
  const remuneration = contract.remuneration;
  const hoje       = formatDateLong(new Date().toISOString().split('T')[0]);

  return (
    <Document
      title={`${contract.numero_contrato} — ${provider.nome_razao_social}`}
      author={company.razao_social}
      subject="Contrato de Prestação de Serviços"
      creator="ContractCore"
    >

      {/* ── CAPA ─────────────────────────────────────────────── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverTop}>
          {company.logo_url && (
            <Image
              src={company.logo_url}
              style={{ width: 100, height: 40, objectFit: 'contain', marginBottom: 48 }}
            />
          )}
          <View>
            <View style={styles.coverBadge}>
              <Text style={styles.coverBadgeText}>ContractCore · Governança Contratual</Text>
            </View>
            <Text style={styles.coverTitle}>Contrato de{'\n'}Prestação de Serviços</Text>
            <Text style={styles.coverSubtitle}>
              {provider.profissao_descricao || provider.profissao}
              {provider.especialidade ? ` — ${provider.especialidade}` : ''}
            </Text>
            <View style={styles.coverDivider} />
            <View style={styles.coverMeta}>
              {[
                { label: 'Número do Contrato',  value: contract.numero_contrato },
                { label: 'Versão',              value: `v${contract.versao}` },
                { label: 'Data de Emissão',     value: formatDateBR(contract.data_emissao) },
                { label: 'Vigência',            value: contract.vigencia_indeterminada ? 'Indeterminada' : `${formatDateBR(contract.data_vigencia_inicio)} a ${formatDateBR(contract.data_vigencia_fim)}` },
                { label: 'Contratante',         value: company.nome_fantasia },
                { label: 'Contratada',          value: provider.nome_razao_social },
              ].map(item => (
                <View key={item.label} style={styles.coverMetaItem}>
                  <Text style={styles.coverMetaLabel}>{item.label}</Text>
                  <Text style={styles.coverMetaValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.coverBottom}>
          <Text style={styles.coverBottomText}>
            Documento confidencial · Gerado em {hoje} · ContractCore
          </Text>
          <Text style={styles.coverBottomText}>
            {company.cidade}/{company.uf} · {company.cnpj}
          </Text>
        </View>
      </Page>

      {/* ── RESUMO EXECUTIVO ─────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Header company={company} numeroContrato={contract.numero_contrato} versao={contract.versao} />

        <Text style={styles.execTitle}>Resumo Executivo</Text>
        <Text style={styles.execSubtitle}>Visão consolidada das condições contratuais</Text>

        <View style={styles.execGrid}>
          {[
            { label: 'Contratante',          value: `${company.razao_social}\nCNPJ: ${company.cnpj}` },
            { label: 'Contratada / Prestador', value: `${provider.nome_razao_social}\n${provider.cnpj ? 'CNPJ: ' + provider.cnpj : provider.cpf ? 'CPF: ' + provider.cpf : ''}` },
            { label: 'Tipo de Vínculo',      value: `${provider.tipo_pessoa} — Autônomo(a)\nSem vínculo empregatício (CLT)` },
            { label: 'Especialidade',        value: `${provider.profissao_descricao || provider.profissao}${provider.especialidade ? '\n' + provider.especialidade : ''}` },
            { label: 'Vigência',             value: contract.vigencia_indeterminada ? 'Prazo Indeterminado\n(rescisão com 30 dias de aviso)' : `${formatDateBR(contract.data_vigencia_inicio)} até\n${formatDateBR(contract.data_vigencia_fim)}` },
            { label: 'Local de Prestação',   value: service.local_prestacao || company.cidade + '/' + company.uf },
            { label: 'Modalidade',           value: service.modalidade?.toUpperCase() || 'PRESENCIAL' },
            { label: 'Remuneração',          value: remuneration.valor_descricao || '—' },
          ].map(item => (
            <View key={item.label} style={styles.execCard}>
              <Text style={styles.execCardLabel}>{item.label}</Text>
              <Text style={styles.execCardValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {contract.ia_revisado && (
          <View style={{
            backgroundColor: '#e8f5e9', borderRadius: 6, padding: 10,
            borderLeftWidth: 3, borderLeftColor: '#4caf50', marginBottom: 16,
          }}>
            <Text style={{ fontSize: 7, color: '#2e7d32', fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>
              ✓ Revisado pela IA Claude — Mesa Técnica Multidisciplinar
            </Text>
            <Text style={{ fontSize: 7.5, color: '#388e3c', lineHeight: 1.5 }}>
              Este contrato foi analisado por inteligência artificial atuando como equipe de 9 especialistas:
              Jurídico, RH, Departamento Pessoal, Contador, Advogado Trabalhista, Advogado de Direito da Saúde,
              Especialista CFP/CRP, Psicólogo(a) Ético(a) e Especialista em Contratos Empresariais.
            </Text>
          </View>
        )}

        <Footer city={company.cidade} uf={company.uf} />
      </Page>

      {/* ── CORPO DO CONTRATO ────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Header company={company} numeroContrato={contract.numero_contrato} versao={contract.versao} />

        <Text style={styles.sectionTitle}>Qualificação das Partes</Text>
        <Text style={styles.clausulaText}>
          <Text style={styles.clausulaHighlight}>CONTRATANTE: </Text>
          {company.razao_social}, CNPJ nº {company.cnpj}, com sede em {company.logradouro},
          {company.numero}, {company.bairro}, {company.cidade}/{company.uf}, CEP {company.cep},
          representada por {company.responsavel_legal}, CPF nº {company.cpf_responsavel}.
        </Text>
        <Text style={styles.clausulaText}>
          <Text style={styles.clausulaHighlight}>CONTRATADA: </Text>
          {provider.nome_razao_social}, {provider.tipo_pessoa === 'PF'
            ? `CPF nº ${provider.cpf}`
            : `CNPJ nº ${provider.cnpj}`
          }, {provider.profissao_descricao || provider.profissao}
          {provider.conselho_profissional ? `, ${provider.conselho_profissional} nº ${provider.numero_registro_conselho}` : ''},
          com endereço em {provider.logradouro}, {provider.numero}, {provider.cidade}/{provider.uf}.
        </Text>

        {contract.contrato_html ? (
          // Renderizar texto extraído do HTML
          <Text style={styles.clausulaText}>
            {/* Texto do contrato é renderizado como conteúdo do HTML no preview web.
                No PDF, usamos o texto estruturado gerado pelo gerador.
                Para PDF mais fiel, considere a opção Puppeteer. */}
            [Consulte o texto completo no sistema ContractCore ou via exportação HTML.]
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Vigência e Assinatura</Text>
        <Text style={styles.clausulaText}>
          {contract.vigencia_indeterminada
            ? 'Este contrato vigora por prazo indeterminado, podendo ser rescindido por qualquer das partes mediante notificação prévia com antecedência mínima de 30 (trinta) dias.'
            : `Este contrato vigora de ${formatDateBR(contract.data_vigencia_inicio)} até ${formatDateBR(contract.data_vigencia_fim)}.`
          }
        </Text>
        <Text style={styles.clausulaText}>
          {'\n'}{company.cidade}/{company.uf}, {hoje}.
        </Text>

        {/* Assinaturas */}
        <View style={styles.sigGrid}>
          <View style={styles.sigBlock}>
            <View style={[styles.sigLine, { marginTop: 40 }]} />
            <Text style={styles.sigName}>{company.razao_social}</Text>
            <Text style={styles.sigRole}>CNPJ: {company.cnpj}</Text>
            <Text style={styles.sigRole}>{company.responsavel_legal}</Text>
            <Text style={styles.sigDate}>Contratante</Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={[styles.sigLine, { marginTop: 40 }]} />
            <Text style={styles.sigName}>{provider.nome_razao_social}</Text>
            <Text style={styles.sigRole}>{provider.cnpj ? `CNPJ: ${provider.cnpj}` : `CPF: ${provider.cpf}`}</Text>
            <Text style={styles.sigDate}>Contratada / Prestador(a)</Text>
          </View>
        </View>

        <View style={[styles.sigGrid, { marginTop: 20 }]}>
          <View style={styles.sigBlock}>
            <View style={[styles.sigLine, { marginTop: 32 }]} />
            <Text style={styles.sigRole}>Testemunha 1 — CPF: ___________________</Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={[styles.sigLine, { marginTop: 32 }]} />
            <Text style={styles.sigRole}>Testemunha 2 — CPF: ___________________</Text>
          </View>
        </View>

        <Footer city={company.cidade} uf={company.uf} />
      </Page>

      {/* ── ANEXOS ───────────────────────────────────────────── */}
      {contract.anexos && contract.anexos.length > 0 && contract.anexos.map((anexo, i) => (
        <Page key={anexo} size="A4" style={styles.page}>
          <Header company={company} numeroContrato={contract.numero_contrato} versao={contract.versao} />

          <View style={styles.anexoHeader}>
            <Text style={styles.anexoHeaderLabel}>Anexo {String.fromCharCode(65 + i)}</Text>
            <Text style={styles.anexoHeaderTitle}>{getAnexoTitle(anexo)}</Text>
          </View>

          {getAnexoContent(anexo, company, provider).map((para, j) => (
            <Text key={j} style={styles.anexoText}>{para}</Text>
          ))}

          <View style={[styles.sigGrid, { marginTop: 32 }]}>
            <View style={styles.sigBlock}>
              <View style={[styles.sigLine, { marginTop: 32 }]} />
              <Text style={styles.sigName}>{company.razao_social}</Text>
              <Text style={styles.sigDate}>Contratante</Text>
            </View>
            <View style={styles.sigBlock}>
              <View style={[styles.sigLine, { marginTop: 32 }]} />
              <Text style={styles.sigName}>{provider.nome_razao_social}</Text>
              <Text style={styles.sigDate}>Contratada</Text>
            </View>
          </View>

          <Footer city={company.cidade} uf={company.uf} />
        </Page>
      ))}

    </Document>
  );
}

function getAnexoTitle(anexo: string): string {
  const m: Record<string, string> = {
    confidencialidade:     'Termo de Confidencialidade',
    lgpd:                  'Termo de Ciência — LGPD (Lei nº 13.709/2018)',
    prontuarios:           'Termo de Responsabilidade sobre Prontuários e Documentos Clínicos',
    uso_estrutura:         'Termo de Uso da Estrutura da Clínica',
    politica_agenda:       'Política de Agenda, Faltas, Remarcações e Cancelamentos',
    sem_vinculo_clt:       'Declaração de Ausência de Vínculo Empregatício',
    checklist_pj_mei:      'Checklist de Documentação para Contratação PJ/MEI',
    checklist_pejotizacao: 'Checklist de Avaliação de Riscos de Pejotização',
    checklist_conselho:    'Checklist de Regularidade no Conselho Profissional',
    ciencia_etica:         'Termo de Ciência sobre Ética Profissional e Normas do Conselho',
  };
  return m[anexo] || anexo;
}

function getAnexoContent(anexo: string, company: Company, provider: ServiceProvider): string[] {
  const n = provider.nome_razao_social;
  const c = company.razao_social;
  switch (anexo) {
    case 'confidencialidade':
      return [
        `Pelo presente Termo, a CONTRATADA — ${n} — assume as seguintes obrigações de confidencialidade:`,
        '1. Manter sigilo absoluto sobre todas as informações confidenciais da CONTRATANTE, incluindo dados de pacientes, procedimentos clínicos, dados financeiros e estratégicos.',
        '2. Não divulgar, reproduzir, copiar ou transferir quaisquer informações confidenciais a terceiros, sem autorização prévia e expressa por escrito.',
        '3. Adotar medidas técnicas e administrativas para impedir o acesso não autorizado.',
        '4. Comunicar imediatamente qualquer suspeita de vazamento ou acesso indevido a dados.',
        `5. Esta obrigação de sigilo permanece válida por 10 (dez) anos após o encerramento do vínculo entre ${n} e ${c}.`,
        '6. A violação deste Termo ensejará responsabilização civil, penal e deontológica.',
      ];
    case 'lgpd':
      return [
        'Pelo presente Termo, as partes declaram ciência e compromisso com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018):',
        `1. A CONTRATADA — ${n} — atuará como OPERADORA de dados pessoais e sensíveis de saúde, conforme orientação da CONTRATANTE — ${c} — na qualidade de CONTROLADORA.`,
        '2. O tratamento de dados pessoais ocorrerá exclusivamente para as finalidades previstas no contrato principal, vedado qualquer uso diverso sem autorização.',
        '3. A CONTRATADA adotará medidas de segurança técnica e administrativa para proteção dos dados.',
        '4. Incidentes de segurança serão comunicados à CONTRATANTE em até 24 (vinte e quatro) horas.',
        '5. Ao término do contrato, os dados serão devolvidos ou destruídos conforme determinação da CONTRATANTE, salvo obrigação legal de retenção.',
        '6. A CONTRATADA atenderá solicitações de titulares conforme orientação da CONTRATANTE e nos prazos da legislação.',
      ];
    case 'sem_vinculo_clt':
      return [
        'As partes declaram expressamente e de forma inequívoca:',
        '1. O presente contrato é de PRESTAÇÃO DE SERVIÇOS AUTÔNOMA, regido pelos arts. 593 a 609 do Código Civil, NÃO configurando relação de emprego.',
        '2. São expressamente inexistentes entre as partes os elementos configuradores do vínculo empregatício previsto no art. 3º da CLT: pessoalidade compulsória, não eventualidade forçada, onerosidade de natureza salarial e subordinação hierárquica.',
        `3. A CONTRATADA — ${n} — possui plena autonomia técnica, administrativa e de gestão do seu próprio tempo e método de trabalho.`,
        '4. A CONTRATADA responde integralmente por suas obrigações fiscais, tributárias e previdenciárias.',
        '5. A CONTRATANTE não arcará com quaisquer verbas de natureza trabalhista, incluindo férias, 13º salário, FGTS, aviso prévio, horas extras ou qualquer outra verba derivada de relação empregatícia.',
        '6. Ambas as partes reconhecem que a descaracterização deste contrato, mediante prática de atos que configurem subordinação ou controle de jornada, é de responsabilidade exclusiva da parte que os praticou.',
      ];
    default:
      return [
        `As partes acordam as condições específicas deste Anexo — ${getAnexoTitle(anexo)}.`,
        'Este documento é parte integrante e inseparável do Contrato de Prestação de Serviços firmado entre as partes, com ele devendo ser interpretado conjuntamente.',
        `${company.cidade}/${company.uf}, ${formatDateLong(new Date().toISOString().split('T')[0])}.`,
      ];
  }
}
