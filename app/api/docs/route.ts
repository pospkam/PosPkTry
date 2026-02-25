/**
 * Swagger API Documentation Endpoint
 * GET /api-docs
 */

import { NextRequest, NextResponse } from 'next/server';
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kamhub API',
      version: '1.0.0',
      description: 'Туристическая платформа Камчатки - API документация',
      contact: {
        name: 'Kamhub Support',
        email: 'support@kamhub.ru',
      },
    },
    servers: [
      {
        url: 'https://pospk-kamhub-c8e0.twc1.net',
        description: 'Production сервер',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development сервер',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        Tour: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            shortDescription: { type: 'string' },
            category: { type: 'string' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            duration: { type: 'integer' },
            price: { type: 'number' },
            currency: { type: 'string', example: 'RUB' },
            rating: { type: 'number' },
            reviewCount: { type: 'integer' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tourId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] },
            totalPrice: { type: 'number' },
            participants: { type: 'integer' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: 'tours', description: 'Туры' },
      { name: 'bookings', description: 'Бронирования' },
      { name: 'auth', description: 'Аутентификация' },
      { name: 'transfers', description: 'Трансферы' },
      { name: 'accommodations', description: 'Размещения' },
    ],
  },
  apis: ['./app/api/**/*.ts'],
};

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const swaggerSpec = swaggerJsdoc(options);
    
    return NextResponse.json(swaggerSpec, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Swagger generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Swagger spec' },
      { status: 500 }
    );
  }
}
