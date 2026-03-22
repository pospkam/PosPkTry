/**
 * TransferOperatorAgency — агент для трансфер-операторов.
 *
 * transfer_fleet    — список транспортных средств оператора
 * transfer_drivers  — список активных водителей
 * transfer_bookings — предстоящие бронирования трансферов
 * transfer_status   — combined: флот + водители + бронирования
 */

import { pool } from '@/lib/db-pool';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface VehicleRow {
  id: string;
  type: string;
  capacity: number;
  status: string;
}

interface DriverRow {
  id: string;
  license_number: string;
  status: string;
}

interface TransferBookingRow {
  id: string;
  from_location: string;
  to_location: string;
  price: number;
  status: string;
}

export class TransferOperatorAgency {
  async run(
    intent: string,
    context: AgentContext,
    _originalMessage: string
  ): Promise<AgencyResult> {
    switch (intent) {
      case 'transfer_fleet':    return this.getFleet(context);
      case 'transfer_drivers':  return this.getDrivers(context);
      case 'transfer_bookings': return this.getBookings(context);
      case 'transfer_status':   return this.getStatus(context);
      default:
        return {
          response:
            'Доступные команды трансфер-оператора:\n' +
            '- мой автопарк\n' +
            '- мои водители\n' +
            '- мои бронирования\n' +
            '- статус (всё сразу)',
        };
    }
  }

  private async getFleet(context: AgentContext): Promise<AgencyResult> {
    if (!context.user.userId) {
      return { response: 'Войдите в систему для доступа к автопарку.' };
    }

    try {
      const { rows } = await pool.query<VehicleRow>(
        `SELECT id::text, type, capacity, status
         FROM vehicles
         WHERE transfer_operator_id = $1
         ORDER BY type, capacity
         LIMIT 20`,
        [context.user.userId]
      );

      if (rows.length === 0) {
        return { response: 'Транспортные средства не найдены.' };
      }

      const lines = [`<b>Автопарк (${rows.length} единиц):</b>`, ''];
      for (const v of rows) {
        lines.push(`${v.type} | вместимость: ${v.capacity} | ${v.status}`);
      }

      return { response: lines.join('\n'), data: { vehicles: rows } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка запроса автопарка';
      return { response: `Не удалось загрузить автопарк: ${msg}` };
    }
  }

  private async getDrivers(context: AgentContext): Promise<AgencyResult> {
    if (!context.user.userId) {
      return { response: 'Войдите в систему для доступа к водителям.' };
    }

    try {
      const { rows } = await pool.query<DriverRow>(
        `SELECT d.id::text, d.license_number, u.status
         FROM drivers d
         JOIN users u ON u.id = d.user_id
         WHERE d.transfer_operator_id = $1
           AND u.deleted_at IS NULL
         ORDER BY d.license_number
         LIMIT 20`,
        [context.user.userId]
      );

      if (rows.length === 0) {
        return { response: 'Водители не найдены.' };
      }

      const lines = [`<b>Водители (${rows.length}):</b>`, ''];
      for (const d of rows) {
        lines.push(`Лицензия: ${d.license_number} | ${d.status}`);
      }

      return { response: lines.join('\n'), data: { drivers: rows } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка запроса водителей';
      return { response: `Не удалось загрузить водителей: ${msg}` };
    }
  }

  private async getBookings(context: AgentContext): Promise<AgencyResult> {
    if (!context.user.userId) {
      return { response: 'Войдите в систему для доступа к бронированиям.' };
    }

    try {
      const { rows } = await pool.query<TransferBookingRow>(
        `SELECT id::text, from_location, to_location, price, status
         FROM transfers
         WHERE transfer_operator_id = $1
           AND status NOT IN ('cancelled', 'completed')
         ORDER BY id DESC
         LIMIT 10`,
        [context.user.userId]
      );

      if (rows.length === 0) {
        return { response: 'Активных бронирований трансферов не найдено.' };
      }

      const lines = [`<b>Бронирования трансферов (${rows.length}):</b>`, ''];
      for (const b of rows) {
        const price = Number(b.price).toLocaleString('ru-RU');
        lines.push(`${b.from_location} → ${b.to_location} | ${price} руб | ${b.status}`);
      }

      return { response: lines.join('\n'), data: { bookings: rows } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка запроса бронирований';
      return { response: `Не удалось загрузить бронирования: ${msg}` };
    }
  }

  private async getStatus(context: AgentContext): Promise<AgencyResult> {
    const [fleet, drivers, bookings] = await Promise.all([
      this.getFleet(context),
      this.getDrivers(context),
      this.getBookings(context),
    ]);

    const parts = [fleet.response, '', drivers.response, '', bookings.response];
    return {
      response: parts.join('\n'),
      data: {
        fleet:    fleet.data,
        drivers:  drivers.data,
        bookings: bookings.data,
      },
    };
  }
}
