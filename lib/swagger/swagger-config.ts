/**
 * Swagger/OpenAPI Configuration for KamHub API
 */

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KamHub API',
      version: '1.0.0',
      description: 'Туристическая платформа KamHub - полная документация API',
      contact: {
        name: 'KamHub Support',
        email: 'api@kamhub.com',
        url: 'https://kamhub.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.kamhub.com',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.kamhub.com',
        description: 'Staging server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer Token'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for service-to-service authentication'
        }
      },
      schemas: {
        // Support Pillar Schemas
        Ticket: {
          type: 'object',
          required: ['subject', 'description', 'customerEmail'],
          properties: {
            id: { 
              type: 'integer',
              example: 1,
              description: 'Уникальный идентификатор тикета'
            },
            ticket_number: { 
              type: 'string',
              example: 'TKT-20250128-001',
              description: 'Номер тикета'
            },
            subject: { 
              type: 'string',
              example: 'Проблема с оплатой',
              description: 'Тема тикета'
            },
            description: { 
              type: 'string',
              example: 'Не проходит оплата картой',
              description: 'Описание проблемы'
            },
            status: { 
              type: 'string',
              enum: ['open', 'in_progress', 'resolved', 'closed'],
              example: 'open',
              description: 'Статус тикета'
            },
            priority_level: { 
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              example: 'high',
              description: 'Уровень приоритета'
            },
            customer_email: { 
              type: 'string',
              format: 'email',
              example: 'customer@example.com',
              description: 'Email клиента'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Дата создания'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Дата обновления'
            }
          }
        },
        KnowledgeBaseArticle: {
          type: 'object',
          properties: {
            id: { 
              type: 'integer',
              description: 'ID статьи'
            },
            title: { 
              type: 'string',
              example: 'Как оплатить тур',
              description: 'Заголовок статьи'
            },
            content: { 
              type: 'string',
              description: 'Содержание статьи'
            },
            category: { 
              type: 'string',
              example: 'payment',
              description: 'Категория'
            },
            views: { 
              type: 'integer',
              example: 150,
              description: 'Количество просмотров'
            },
            helpful_votes: { 
              type: 'integer',
              example: 45,
              description: 'Полезные оценки'
            }
          }
        },
        TicketMessage: {
          type: 'object',
          required: ['content', 'senderType', 'senderId'],
          properties: {
            id: { 
              type: 'integer',
              description: 'ID сообщения'
            },
            ticketId: { 
              type: 'integer',
              description: 'ID тикета'
            },
            content: { 
              type: 'string',
              description: 'Содержание сообщения'
            },
            senderType: { 
              type: 'string',
              enum: ['agent', 'customer', 'system'],
              description: 'Тип отправителя'
            },
            senderId: { 
              type: 'integer',
              description: 'ID отправителя'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Время сообщения'
            },
            attachments: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Вложения'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            code: { 
              type: 'string',
              example: 'VALIDATION_ERROR'
            },
            message: { 
              type: 'string',
              example: 'Validation error'
            },
            details: {
              type: 'array',
              items: {
                type: 'object'
              }
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object'
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                pages: { type: 'integer' }
              }
            }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        BadRequest: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Support Pillar',
        description: 'Support ticket management and knowledge base'
      },
      {
        name: 'Tickets',
        description: 'Ticket operations'
      },
      {
        name: 'Knowledge Base',
        description: 'Knowledge base articles and search'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      }
    ]
  },
  apis: [
    './pages/api/**/*.ts',
    './lib/swagger/paths/**/*.yaml'
  ]
};

export default swaggerOptions;
