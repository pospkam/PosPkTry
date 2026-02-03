// Маски ввода для форматирования данных

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  let result = '+7';
  if (digits.length > 1) {
    result += ' (' + digits.slice(1, 4);
  }
  if (digits.length > 4) {
    result += ') ' + digits.slice(4, 7);
  }
  if (digits.length > 7) {
    result += '-' + digits.slice(7, 9);
  }
  if (digits.length > 9) {
    result += '-' + digits.slice(9, 11);
  }
  
  return result;
}

export function maskINN(value: string): string {
  return value.replace(/\D/g, '').slice(0, 12);
}

export function maskOGRN(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}

export function maskKPP(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

export function maskBIK(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

export function maskAccount(value: string): string {
  return value.replace(/\D/g, '').slice(0, 20);
}
