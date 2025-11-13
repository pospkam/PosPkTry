import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, Souvenir, SouvenirCategory } from '@/types';

// Mock данные сувениров (временно, до реализации БД)
const mockSouvenirs: Souvenir[] = [
  {
    id: '1',
    name: 'Магнит "Вулкан Авачинский"',
    description: 'Красочный магнит с изображением вулкана Авачинский',
    shortDescription: 'Магнит с вулканом',
    category: 'Магниты' as SouvenirCategory,
    subcategory: 'Вулканы',
    price: 250,
    currency: 'RUB',
    images: ['/souvenirs/magnet-volcano.jpg'],
    tags: ['вулкан', 'магнит', 'камчатка'],
    isActive: true,
    isFeatured: true,
    stockQuantity: 50,
    lowStockThreshold: 10,
    weight: 0.05,
    dimensions: {
      length: 5,
      width: 5,
      height: 0.5
    },
    rating: 4.8,
    reviewCount: 15,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-11-01')
  },
  {
    id: '2',
    name: 'Кружка "Медведь Камчатки"',
    description: 'Керамическая кружка с принтом камчатского медведя',
    shortDescription: 'Кружка с медведем',
    category: 'Посуда' as SouvenirCategory,
    subcategory: 'Кружки',
    price: 800,
    currency: 'RUB',
    discountPrice: 720,
    images: ['/souvenirs/mug-bear.jpg'],
    tags: ['медведь', 'кружка', 'керамика'],
    isActive: true,
    isFeatured: false,
    stockQuantity: 25,
    lowStockThreshold: 5,
    weight: 0.3,
    dimensions: {
      length: 10,
      width: 8,
      height: 10
    },
    rating: 4.6,
    reviewCount: 8,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-10-15')
  },
  {
    id: '3',
    name: 'Футболка "Я люблю Камчатку"',
    description: 'Удобная хлопковая футболка с патриотичным принтом',
    shortDescription: 'Футболка с принтом',
    category: 'Одежда' as SouvenirCategory,
    subcategory: 'Футболки',
    price: 1500,
    currency: 'RUB',
    images: ['/souvenirs/tshirt-kamchatka.jpg'],
    tags: ['футболка', 'одежда', 'камчатка'],
    isActive: true,
    isFeatured: true,
    stockQuantity: 30,
    lowStockThreshold: 8,
    weight: 0.2,
    dimensions: {
      length: 70,
      width: 50,
      height: 2
    },
    rating: 4.9,
    reviewCount: 22,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-11-05')
  }
];

// GET /api/souvenirs - Получить список сувениров
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filteredSouvenirs = [...mockSouvenirs];

    // Фильтр по категории
    if (category) {
      filteredSouvenirs = filteredSouvenirs.filter(s => s.category === category);
    }

    // Фильтр по featured
    if (featured) {
      filteredSouvenirs = filteredSouvenirs.filter(s => s.isFeatured);
    }

    // Пагинация
    const total = filteredSouvenirs.length;
    filteredSouvenirs = filteredSouvenirs.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: filteredSouvenirs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching souvenirs:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении сувениров' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// POST /api/souvenirs - Создать новый сувенир (для админов)
export async function POST(request: NextRequest) {
  try {
    // TODO: Добавить проверку прав администратора
    const body = await request.json();

    // Генерируем ID и добавляем timestamps
    const newSouvenir: Souvenir = {
      ...body,
      id: `souvenir-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // В реальной реализации сохраняем в БД
    mockSouvenirs.push(newSouvenir);

    return NextResponse.json({
      success: true,
      data: newSouvenir,
      message: 'Сувенир успешно создан'
    } as ApiResponse<Souvenir>);
  } catch (error) {
    console.error('Error creating souvenir:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании сувенира' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}






