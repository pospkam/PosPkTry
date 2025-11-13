import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

// Mock данные автомобилей (временно, до реализации БД)
const mockCars = [
  {
    id: '1',
    name: 'Toyota Land Cruiser Prado',
    description: 'Надежный внедорожник для поездок по Камчатке',
    category: 'Внедорожник',
    seats: 5,
    transmission: 'Автомат',
    fuelType: 'Бензин',
    pricePerDay: 5000,
    pricePerHour: 500,
    isAvailable: true,
    images: ['/cars/prado.jpg'],
    features: ['4WD', 'Кондиционер', 'GPS', 'Крепления для лыж'],
    rating: 4.8,
    reviewCount: 12,
    location: 'Петропавловск-Камчатский',
    minRentalDays: 1,
    maxRentalDays: 30
  },
  {
    id: '2',
    name: 'Nissan Patrol',
    description: 'Мощный автомобиль для экстремальных условий',
    category: 'Внедорожник',
    seats: 7,
    transmission: 'Механика',
    fuelType: 'Дизель',
    pricePerDay: 4500,
    pricePerHour: 450,
    isAvailable: true,
    images: ['/cars/patrol.jpg'],
    features: ['4WD', 'Топливный обогреватель', 'Лебёдка', 'Дополнительный бак'],
    rating: 4.6,
    reviewCount: 8,
    location: 'Петропавловск-Камчатский',
    minRentalDays: 2,
    maxRentalDays: 30
  },
  {
    id: '3',
    name: 'Mitsubishi Pajero',
    description: 'Комфортный внедорожник для семейных поездок',
    category: 'Внедорожник',
    seats: 5,
    transmission: 'Автомат',
    fuelType: 'Бензин',
    pricePerDay: 4000,
    pricePerHour: 400,
    isAvailable: false,
    images: ['/cars/pajero.jpg'],
    features: ['4WD', 'Климат-контроль', 'Круиз-контроль', 'Подогрев сидений'],
    rating: 4.7,
    reviewCount: 15,
    location: 'Елизово',
    minRentalDays: 1,
    maxRentalDays: 30
  }
];

// GET /api/cars - Получить список автомобилей
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const available = searchParams.get('available') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filteredCars = [...mockCars];

    // Фильтр по доступности
    if (available) {
      filteredCars = filteredCars.filter(car => car.isAvailable);
    }

    // Пагинация
    const total = filteredCars.length;
    filteredCars = filteredCars.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: filteredCars,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching cars:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении автомобилей' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}