import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

// Mock данные снаряжения (временно, до реализации БД)
const mockGear = [
  {
    id: '1',
    name: 'Горные лыжи Rossignol',
    description: 'Профессиональные горные лыжи для катания по склонам Камчатки',
    category: 'Лыжи',
    pricePerDay: 1500,
    pricePerWeek: 8000,
    isAvailable: true,
    condition: 'Отличное',
    images: ['/gear/skis-rossignol.jpg'],
    features: ['Карвинг', 'Графитовая конструкция', 'Усиленные края'],
    rating: 4.7,
    reviewCount: 23,
    location: 'База в Петропавловске',
    size: '170-185 см',
    weight: '3.2 кг'
  },
  {
    id: '2',
    name: 'Снегоход Yamaha VK540',
    description: 'Мощный снегоход для передвижения по заснеженной местности',
    category: 'Снегоходы',
    pricePerDay: 8000,
    pricePerWeek: 40000,
    isAvailable: true,
    condition: 'Отличное',
    images: ['/gear/snowmobile-yamaha.jpg'],
    features: ['540cc двигатель', 'Электрический стартер', 'Теплая кабина'],
    rating: 4.9,
    reviewCount: 15,
    location: 'Аренда в Елизово',
    size: 'Одноместный',
    weight: '280 кг'
  },
  {
    id: '3',
    name: 'Рюкзак туристический Deuter',
    description: 'Легкий и прочный рюкзак для многодневных походов',
    category: 'Рюкзаки',
    pricePerDay: 300,
    pricePerWeek: 1500,
    isAvailable: false,
    condition: 'Хорошее',
    images: ['/gear/backpack-deuter.jpg'],
    features: ['60 л объём', 'Водонепроницаемая ткань', 'Эргономичные лямки'],
    rating: 4.5,
    reviewCount: 31,
    location: 'База в Петропавловске',
    size: 'M/L',
    weight: '1.8 кг'
  }
];

// GET /api/gear - Получить список снаряжения
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const available = searchParams.get('available') === 'true';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filteredGear = [...mockGear];

    // Фильтр по доступности
    if (available) {
      filteredGear = filteredGear.filter(item => item.isAvailable);
    }

    // Фильтр по категории
    if (category) {
      filteredGear = filteredGear.filter(item => item.category === category);
    }

    // Пагинация
    const total = filteredGear.length;
    filteredGear = filteredGear.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: filteredGear,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching gear:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении снаряжения' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}