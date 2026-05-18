const phpCurrency = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
});

export const formatPHP = (value: number | string | null | undefined) =>
  phpCurrency.format(Number(value || 0));

export const PHP_LABEL = 'Philippine Peso (PHP)';


