/**
 * Avito Channel Adapter — СКЕЛЕТ
 * Заполняется после изучения API через аккаунт КР
 *
 * Env: AVITO_CLIENT_ID, AVITO_CLIENT_SECRET
 * Docs: https://developers.avito.ru/
 */

import type {
  ChannelAdapter, ChannelBooking, ChannelName,
  PushBookingInput, PushBookingResult,
} from './types';

export const avitoAdapter: ChannelAdapter = {
  name: 'avito' as ChannelName,

  async pushBooking(_input: PushBookingInput): Promise<PushBookingResult> {
    // Авито не имеет booking API для туров.
    // Бронирования приходят через мессенджер Авито.
    // TODO: уведомление оператору через Telegram когда появляется сообщение на Авито
    return { success: false, error: 'Авито booking API не реализован — используется ручной флоу' };
  },

  async pollOrders(_since: Date): Promise<ChannelBooking[]> {
    // TODO: Авито Messenger API — читаем входящие сообщения
    // https://developers.avito.ru/api-catalog/messenger/documentation
    return [];
  },
};
