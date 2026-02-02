// Валидация данных партнера по законодательству РФ

import { PartnerFormData, BusinessType } from './types';

// Валидация ИНН
export function validateINN(inn: string, businessType: BusinessType): string | null {
  const cleanInn = inn.replace(/\D/g, '');
  
  if (businessType === 'individual' || businessType === 'ip') {
    // ИНН физлица/ИП - 12 цифр
    if (cleanInn.length !== 12) {
      return 'ИНН должен содержать 12 цифр';
    }
    // Проверка контрольных сумм
    const checksum1 = (7*+cleanInn[0] + 2*+cleanInn[1] + 4*+cleanInn[2] + 10*+cleanInn[3] + 
                       3*+cleanInn[4] + 5*+cleanInn[5] + 9*+cleanInn[6] + 4*+cleanInn[7] + 
                       6*+cleanInn[8] + 8*+cleanInn[9]) % 11 % 10;
    const checksum2 = (3*+cleanInn[0] + 7*+cleanInn[1] + 2*+cleanInn[2] + 4*+cleanInn[3] + 
                       10*+cleanInn[4] + 3*+cleanInn[5] + 5*+cleanInn[6] + 9*+cleanInn[7] + 
                       4*+cleanInn[8] + 6*+cleanInn[9] + 8*+cleanInn[10]) % 11 % 10;
    if (checksum1 !== +cleanInn[10] || checksum2 !== +cleanInn[11]) {
      return 'Некорректный ИНН';
    }
  } else {
    // ИНН юрлица - 10 цифр
    if (cleanInn.length !== 10) {
      return 'ИНН должен содержать 10 цифр';
    }
    const checksum = (2*+cleanInn[0] + 4*+cleanInn[1] + 10*+cleanInn[2] + 3*+cleanInn[3] + 
                      5*+cleanInn[4] + 9*+cleanInn[5] + 4*+cleanInn[6] + 6*+cleanInn[7] + 
                      8*+cleanInn[8]) % 11 % 10;
    if (checksum !== +cleanInn[9]) {
      return 'Некорректный ИНН';
    }
  }
  
  return null;
}

// Валидация ОГРН/ОГРНИП
export function validateOGRN(ogrn: string, businessType: BusinessType): string | null {
  const cleanOgrn = ogrn.replace(/\D/g, '');
  
  if (businessType === 'ip') {
    // ОГРНИП - 15 цифр
    if (cleanOgrn.length !== 15) {
      return 'ОГРНИП должен содержать 15 цифр';
    }
    const checksum = parseInt(cleanOgrn.slice(0, 14)) % 13 % 10;
    if (checksum !== +cleanOgrn[14]) {
      return 'Некорректный ОГРНИП';
    }
  } else if (businessType === 'ooo' || businessType === 'other') {
    // ОГРН - 13 цифр
    if (cleanOgrn.length !== 13) {
      return 'ОГРН должен содержать 13 цифр';
    }
    const checksum = parseInt(cleanOgrn.slice(0, 12)) % 11 % 10;
    if (checksum !== +cleanOgrn[12]) {
      return 'Некорректный ОГРН';
    }
  }
  
  return null;
}

// Валидация КПП
export function validateKPP(kpp: string): string | null {
  const cleanKpp = kpp.replace(/\D/g, '');
  if (cleanKpp.length !== 9) {
    return 'КПП должен содержать 9 цифр';
  }
  return null;
}

// Валидация БИК
export function validateBIK(bik: string): string | null {
  const cleanBik = bik.replace(/\D/g, '');
  if (cleanBik.length !== 9) {
    return 'БИК должен содержать 9 цифр';
  }
  if (!cleanBik.startsWith('04')) {
    return 'БИК должен начинаться с 04';
  }
  return null;
}

// Валидация расчетного счета
export function validateAccount(account: string, bik: string): string | null {
  const cleanAccount = account.replace(/\D/g, '');
  const cleanBik = bik.replace(/\D/g, '');
  
  if (cleanAccount.length !== 20) {
    return 'Расчетный счет должен содержать 20 цифр';
  }
  
  // Проверка контрольной суммы с БИК
  if (cleanBik.length === 9) {
    const checkString = cleanBik.slice(6) + cleanAccount;
    const coefficients = [7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1];
    let sum = 0;
    for (let i = 0; i < 23; i++) {
      sum += coefficients[i] * (+checkString[i] % 10);
    }
    if (sum % 10 !== 0) {
      return 'Некорректный расчетный счет';
    }
  }
  
  return null;
}

// Валидация корреспондентского счета
export function validateCorrespondentAccount(account: string): string | null {
  const cleanAccount = account.replace(/\D/g, '');
  if (cleanAccount.length !== 20) {
    return 'Корреспондентский счет должен содержать 20 цифр';
  }
  if (!cleanAccount.startsWith('301')) {
    return 'Корреспондентский счет должен начинаться с 301';
  }
  return null;
}

// Валидация телефона
export function validatePhone(phone: string): string | null {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length !== 11) {
    return 'Телефон должен содержать 11 цифр';
  }
  if (!cleanPhone.startsWith('7') && !cleanPhone.startsWith('8')) {
    return 'Телефон должен начинаться с 7 или 8';
  }
  return null;
}

// Валидация email
export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Некорректный email';
  }
  return null;
}

// Валидация пароля
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Пароль должен быть не менее 8 символов';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Пароль должен содержать заглавную букву';
  }
  if (!/[a-z]/.test(password)) {
    return 'Пароль должен содержать строчную букву';
  }
  if (!/[0-9]/.test(password)) {
    return 'Пароль должен содержать цифру';
  }
  return null;
}

// Валидация шага формы
export function validateStep(step: number, data: PartnerFormData): string | null {
  switch (step) {
    case 1: // Тип бизнеса
      if (!data.businessType) {
        return 'Выберите тип бизнеса';
      }
      break;
      
    case 2: // Юридические данные
      if (!data.companyName.trim()) {
        return 'Введите наименование организации';
      }
      const innError = validateINN(data.inn, data.businessType);
      if (innError) return innError;
      
      if (data.businessType !== 'individual') {
        const ogrnError = validateOGRN(data.ogrn, data.businessType);
        if (ogrnError) return ogrnError;
      }
      
      if (data.businessType === 'ooo' || data.businessType === 'other') {
        const kppError = validateKPP(data.kpp);
        if (kppError) return kppError;
      }
      
      if (!data.legalAddress.trim()) {
        return 'Введите юридический адрес';
      }
      break;
      
    case 3: // Контактные данные
      if (!data.contactPerson.trim()) {
        return 'Введите ФИО контактного лица';
      }
      const emailError = validateEmail(data.email);
      if (emailError) return emailError;
      
      const phoneError = validatePhone(data.phone);
      if (phoneError) return phoneError;
      break;
      
    case 4: // Банковские реквизиты
      if (!data.bankName.trim()) {
        return 'Введите наименование банка';
      }
      const bikError = validateBIK(data.bik);
      if (bikError) return bikError;
      
      const corrError = validateCorrespondentAccount(data.correspondentAccount);
      if (corrError) return corrError;
      
      const accountError = validateAccount(data.checkingAccount, data.bik);
      if (accountError) return accountError;
      break;
      
    case 5: // Направления деятельности
      if (data.roles.length === 0) {
        return 'Выберите хотя бы одно направление деятельности';
      }
      break;
      
    case 6: // Дополнительно
      // Опционально
      break;
      
    case 7: // Согласия и пароль
      const passwordError = validatePassword(data.password);
      if (passwordError) return passwordError;
      
      if (data.password !== data.confirmPassword) {
        return 'Пароли не совпадают';
      }
      
      if (!data.agreePersonalData) {
        return 'Необходимо согласие на обработку персональных данных';
      }
      if (!data.agreeUserAgreement) {
        return 'Необходимо согласие с пользовательским соглашением';
      }
      if (!data.agreeOffer) {
        return 'Необходимо согласие с офертой';
      }
      if (!data.agreeCommission) {
        return 'Необходимо согласие с условиями комиссии';
      }
      break;
  }
  
  return null;
}
