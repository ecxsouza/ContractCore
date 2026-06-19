// ================================================================
// ContractCore — Máscaras e Formatadores BR
// ================================================================

export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function maskCEP(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

export function maskCurrency(value: string | number): string {
  const num = typeof value === 'number' ? value
    : parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function maskDate(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d{1,4})$/, '$1/$2');
}

// Capitalizar nome preservando conectores
export function capitalizeName(value: string): string {
  const conectores = ['de','da','do','dos','das','e','em','a','ao','às','na','no','nas','nos'];
  return value
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      if (conectores.includes(word)) return word;
      // Preservar abreviações (ex: "F." em "João F. Silva")
      if (/^[a-z]\.$/.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Alias semântico de capitalizeName para uso em Razão Social, Nome Fantasia e
// campos de endereço (logradouro, complemento, bairro, cidade) — PJ, MEI e PF.
// Reutiliza a mesma lógica de Title Case já validada, incluindo conectores
// em minúsculo ("de", "e", "da"...) e preservação de abreviações.
export function formatTitleCase(value: string): string {
  if (!value) return value;
  return capitalizeName(value);
}

// Limpar apenas dígitos
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

// Validar CPF (algoritmo oficial)
export function validateCPF(cpf: string): boolean {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(digits[10]);
}

// Validar CNPJ (algoritmo oficial)
export function validateCNPJ(cnpj: string): boolean {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calcDigit = (d: string, weights: number[]) =>
    11 - (d.split('').slice(0, weights.length)
      .reduce((sum, n, i) => sum + parseInt(n) * weights[i], 0) % 11);
  const d1 = calcDigit(digits, [5,4,3,2,9,8,7,6,5,4,3,2]);
  const d2 = calcDigit(digits, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return (d1 > 9 ? 0 : d1) === parseInt(digits[12])
      && (d2 > 9 ? 0 : d2) === parseInt(digits[13]);
}

// Formatar data ISO para exibição BR
export function formatDateBR(isoDate?: string | null): string {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

// Formatar data por extenso
export function formatDateLong(isoDate?: string | null): string {
  if (!isoDate) return '—';
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// Formatar entrada de valor em moeda BRL enquanto digita
export function maskCurrencyInput(value: string): string {
  // Remove tudo exceto dígitos
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  // Converte para centavos e depois para reais
  const cents = parseInt(digits, 10);
  const reais = cents / 100;
  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

// Extrai valor numérico de string formatada
export function parseCurrencyInput(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

// ── INSCRIÇÃO ESTADUAL POR UF ─────────────────────────────────────
export function maskIE(value: string, uf: string): string {
  const digits = value.replace(/\D/g, '');
  switch (uf?.toUpperCase()) {
    case 'SP': // ###.###.###.###
      return digits.slice(0,12)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,3})$/, '$1.$2');
    case 'RJ': // ##.###.##-#
      return digits.slice(0,8)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{2})(\d{1})$/, '$1-$2');
    case 'MG': // ###.###.###/####
      return digits.slice(0,13)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,4})$/, '$1/$2');
    case 'RS': // ###-#######
      return digits.slice(0,10)
        .replace(/(\d{3})(\d{1,7})$/, '$1-$2');
    case 'SC': // ###.###.###
      return digits.slice(0,9)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,3})$/, '$1.$2');
    case 'PR': // ########-##
      return digits.slice(0,10)
        .replace(/(\d{8})(\d{1,2})$/, '$1-$2');
    case 'BA': // ###.###.##-#
      return digits.slice(0,8)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{2})(\d{1})$/, '$1-$2');
    case 'GO': // ##.###.###-#
      return digits.slice(0,9)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1})$/, '$1-$2');
    default: // genérico: até 14 dígitos com pontos
      return digits.slice(0, 14);
  }
}

// ── INSCRIÇÃO MUNICIPAL (ISS / CCM) ──────────────────────────────
export function maskISS(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 9) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{3})(\d{1})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{3})(\d{1})$/, '$1-$2');
}

// ── RG COM DÍGITO VERIFICADOR ALFANUMÉRICO ────────────────────────
export function maskRG(value: string): string {
  // Remove tudo exceto dígitos e X/x
  const clean = value.replace(/[^0-9Xx]/g, '').slice(0, 9);
  // Formato: ##.###.###-#  (onde # pode ser X no último)
  return clean
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3}\.\d{3})([0-9Xx])$/, '$1-$2');
}
