const clean = (text) => String(text || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ');

const field = (text, labels) => {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[-–:]\\s*([^\\n\\r]*)`, 'i');
    const match = text.match(re);
    if (match && match[1].trim()) return match[1].trim();
  }
  return '';
};

export const parseMoney = (raw) => {
  if (!raw) return null;
  const match = String(raw).replace(/r\$/i, '').match(/[\d.,]+/);
  if (!match) return null;
  let value = match[0];
  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(value)) value = value.replace(/\./g, '');
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : null;
};

const parseBirthDate = (raw) => {
  const match = String(raw || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
};

const parsePhone = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
};

export function parseContactDetails(rawDescription) {
  const text = clean(rawDescription);
  if (!text.trim()) return {};

  const valorRaw = field(text, ['Valor', 'Valor total']);
  const installmentsMatch = valorRaw.match(/(\d+)\s*x/i);

  return {
    name: field(text, ['Nome', 'Cliente']),
    cpf: field(text, ['CPF']).replace(/[^\d]/g, '') || '',
    whatsapp: parsePhone(field(text, ['Contato', 'Telefone', 'WhatsApp', 'Phone', 'Celular'])),
    email: field(text, ['E-mail', 'Email']).replace(/^-\s*/, ''),
    birth_date: parseBirthDate(field(text, ['Data de Nascimento', 'Nascimento', 'Aniversário'])),
    total_value: parseMoney(valorRaw),
    installments: installmentsMatch ? Number(installmentsMatch[1]) : null,
    deposit_value: parseMoney(field(text, ['Pago', 'Sinal', 'Entrada'])),
  };
}