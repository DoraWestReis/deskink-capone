/**
 * Returns commission rate (0-1) for a given payment method based on settings.
 * Handles both default, custom label, and legacy payment method names.
 */
export function getCommissionRate(paymentMethod, installments, settings) {
  if (!settings) return 0.5;
  if (!paymentMethod) return (settings.pix_cash_commission ?? 50) / 100;

  const pixLabel = settings.pix_label || 'Pix';
  const cashLabel = settings.cash_label || 'Dinheiro';
  const cardNoInterestLabel = settings.card_no_interest_label || 'Cartão sem juros';
  const cardWithInterestLabel = settings.card_with_interest_label || 'Cartão com juros';
  const otherLabel = settings.other_label || 'Outros';

  if (paymentMethod === 'Pix' || paymentMethod === pixLabel) {
    return (settings.pix_cash_commission ?? 50) / 100;
  }
  if (paymentMethod === 'Dinheiro' || paymentMethod === cashLabel) {
    return (settings.pix_cash_commission ?? 50) / 100;
  }
  if (paymentMethod === 'Cartão sem juros' || paymentMethod === cardNoInterestLabel || paymentMethod === 'Cartão Débito') {
    return (settings.card_no_interest_commission ?? settings.debit_card_commission ?? 50) / 100;
  }
  if (paymentMethod === 'Cartão com juros' || paymentMethod === cardWithInterestLabel) {
    return (settings.card_with_interest_commission ?? settings.installment_credit_commission ?? 50) / 100;
  }
  if (paymentMethod === 'Outros' || paymentMethod === otherLabel) {
    return (settings.other_commission ?? settings.pix_cash_commission ?? 50) / 100;
  }
  if (paymentMethod === 'Cartão Crédito') {
    if (installments && installments > 1) {
      return (settings.card_with_interest_commission ?? settings.installment_credit_commission ?? 50) / 100;
    }
    return (settings.card_no_interest_commission ?? settings.credit_card_commission ?? 50) / 100;
  }

  return (settings.pix_cash_commission ?? 50) / 100;
}