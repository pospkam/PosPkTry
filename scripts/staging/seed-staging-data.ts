#!/usr/bin/env ts-node

/**
 * Seed Staging Data Script
 * Создает тестовые данные для staging среды
 * Usage: npm run staging:seed
 */

import { v4 as uuid } from 'uuid';
import { hash } from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.staging' });

interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
  phone: string;
}

interface TestTour {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  duration_days: number;
  max_group_size: number;
  guide_name: string;
  rating: number;
}

interface TestTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  customer_email: string;
}

class StagingDataSeeder {
  private client: pg.Client;
  private testUsers: TestUser[] = [];
  private testTours: TestTour[] = [];
  private testTickets: TestTicket[] = [];

  constructor() {
    this.client = new pg.Client({
      connectionString: process.env.DATABASE_URL_STAGING,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log('✅ Connected to staging database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    console.log('✅ Disconnected from database');
  }

  async seedUsers(): Promise<void> {
    console.log('\n📝 Seeding users...');

    const testUsers: TestUser[] = [
      {
        id: uuid(),
        email: 'admin@staging.kamhub.com',
        password: 'AdminPass123!',
        name: 'Staging Admin',
        role: 'admin',
        phone: '+79991234567'
      },
      {
        id: uuid(),
        email: 'agent@staging.kamhub.com',
        password: 'AgentPass123!',
        name: 'Support Agent',
        role: 'agent',
        phone: '+79991234568'
      },
      {
        id: uuid(),
        email: 'customer@staging.kamhub.com',
        password: 'CustomerPass123!',
        name: 'Test Customer',
        role: 'customer',
        phone: '+79991234569'
      },
      {
        id: uuid(),
        email: 'tourist1@staging.kamhub.com',
        password: 'Tourist123!',
        name: 'Ivan Turist',
        role: 'customer',
        phone: '+79991234570'
      },
      {
        id: uuid(),
        email: 'tourist2@staging.kamhub.com',
        password: 'Tourist123!',
        name: 'Maria Puteshestvennica',
        role: 'customer',
        phone: '+79991234571'
      }
    ];

    for (const user of testUsers) {
      const passwordHash = await hash(user.password, 10);

      await this.client.query(
        `INSERT INTO users (
          id, email, password_hash, name, role, phone, 
          is_verified, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (email) DO NOTHING`,
        [
          user.id,
          user.email,
          passwordHash,
          user.name,
          user.role,
          user.phone,
          true, // is_verified
          true  // is_active
        ]
      );

      console.log(`  ✅ Created user: ${user.email} (${user.role})`);
      this.testUsers.push(user);
    }
  }

  async seedTours(): Promise<void> {
    console.log('\n📝 Seeding tours...');

    const testTours: TestTour[] = [
      {
        id: uuid(),
        title: 'Восхождение на Вулкан Авачинский',
        description: 'Экспедиция на вулкан Авачинский с опытным гидом. Величественный вид на Камчатку.',
        price: 149.99,
        location: 'Камчатка, Россия',
        duration_days: 3,
        max_group_size: 15,
        guide_name: 'Sergey Sidarov',
        rating: 4.8
      },
      {
        id: uuid(),
        title: 'Круиз по Байкалу',
        description: 'Уникальное путешествие по самому глубокому озеру в мире. Исследуйте острова и берега.',
        price: 199.99,
        location: 'Озеро Байкал, Россия',
        duration_days: 7,
        max_group_size: 20,
        guide_name: 'Natasha Volkova',
        rating: 4.9
      },
      {
        id: uuid(),
        title: 'Трекинг по Алтайским горам',
        description: 'Многодневный трекинг сквозь живописные Алтайские горы. Природа в её лучшем виде.',
        price: 179.99,
        location: 'Алтайские горы, Россия',
        duration_days: 5,
        max_group_size: 12,
        guide_name: 'Ivan Petrov',
        rating: 4.7
      },
      {
        id: uuid(),
        title: 'Тур по Золотому кольцу России',
        description: 'Посетите древние города России: Владимир, Суздаль, Ростов Великий. История на каждом шагу.',
        price: 89.99,
        location: 'Центральная Россия',
        duration_days: 4,
        max_group_size: 30,
        guide_name: 'Elena Smirnova',
        rating: 4.6
      },
      {
        id: uuid(),
        title: 'Экспедиция на Новую Землю',
        description: 'Редкая возможность посетить северные острова. Полярное сияние гарантировано в сезон.',
        price: 299.99,
        location: 'Новая Земля, Россия',
        duration_days: 10,
        max_group_size: 10,
        guide_name: 'Dmitry Volkov',
        rating: 4.9
      }
    ];

    for (const tour of testTours) {
      await this.client.query(
        `INSERT INTO tours (
          id, title, description, price, location, 
          duration_days, max_group_size, guide_name, rating, 
          is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (id) DO NOTHING`,
        [
          tour.id,
          tour.title,
          tour.description,
          tour.price,
          tour.location,
          tour.duration_days,
          tour.max_group_size,
          tour.guide_name,
          tour.rating,
          true // is_active
        ]
      );

      console.log(`  ✅ Created tour: ${tour.title}`);
      this.testTours.push(tour);
    }
  }

  async seedTickets(): Promise<void> {
    console.log('\n📝 Seeding support tickets...');

    const customerUser = this.testUsers.find(u => u.role === 'customer');
    if (!customerUser) {
      console.log('  ⚠️  Skipping tickets: No customer user found');
      return;
    }

    const testTickets: TestTicket[] = [
      {
        id: uuid(),
        ticket_number: `TKT-STAGING-${Date.now().toString().slice(-6)}`,
        subject: 'Вопрос о гиде тура',
        description: 'Говорит ли гид по-английски? Нужен англоговорящий гид.',
        status: 'open',
        priority: 'normal',
        customer_email: customerUser.email
      },
      {
        id: uuid(),
        ticket_number: `TKT-STAGING-${(Date.now() + 1).toString().slice(-6)}`,
        subject: 'Проблема с оплатой',
        description: 'Платеж не прошел, но деньги списаны со счета. Требуется помощь.',
        status: 'in_progress',
        priority: 'high',
        customer_email: customerUser.email
      },
      {
        id: uuid(),
        ticket_number: `TKT-STAGING-${(Date.now() + 2).toString().slice(-6)}`,
        subject: 'Отмена бронирования',
        description: 'Хочу отменить тур. Возможно ли вернуть деньги?',
        status: 'open',
        priority: 'normal',
        customer_email: customerUser.email
      }
    ];

    for (const ticket of testTickets) {
      await this.client.query(
        `INSERT INTO support_tickets (
          id, ticket_number, subject, description, 
          status, priority_level, customer_email, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (ticket_number) DO NOTHING`,
        [
          ticket.id,
          ticket.ticket_number,
          ticket.subject,
          ticket.description,
          ticket.status,
          ticket.priority,
          ticket.customer_email
        ]
      );

      console.log(`  ✅ Created ticket: ${ticket.ticket_number} - ${ticket.subject}`);
      this.testTickets.push(ticket);
    }
  }

  async seedWishlists(): Promise<void> {
    console.log('\n📝 Seeding wishlists...');

    const customerUser = this.testUsers.find(u => u.role === 'customer');
    if (!customerUser || this.testTours.length === 0) {
      console.log('  ⚠️  Skipping wishlists: Missing user or tours');
      return;
    }

    const wishlists = [
      {
        id: uuid(),
        user_id: customerUser.id,
        name: 'Мечты на 2026',
        description: 'Туры, о которых я мечтаю',
        tours: this.testTours.slice(0, 2).map(t => t.id)
      },
      {
        id: uuid(),
        user_id: customerUser.id,
        name: 'Планы на лето',
        description: 'Летние путешествия',
        tours: this.testTours.slice(2, 4).map(t => t.id)
      }
    ];

    for (const wishlist of wishlists) {
      await this.client.query(
        `INSERT INTO wishlists (
          id, user_id, name, description, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO NOTHING`,
        [wishlist.id, wishlist.user_id, wishlist.name, wishlist.description]
      );

      console.log(`  ✅ Created wishlist: ${wishlist.name}`);
    }
  }

  async seedReviews(): Promise<void> {
    console.log('\n📝 Seeding reviews...');

    const customerUser = this.testUsers.find(u => u.role === 'customer');
    if (!customerUser || this.testTours.length === 0) {
      console.log('  ⚠️  Skipping reviews: Missing user or tours');
      return;
    }

    const reviews = [
      {
        id: uuid(),
        tour_id: this.testTours[0].id,
        user_id: customerUser.id,
        rating: 5,
        title: 'Потрясающее путешествие!',
        text: 'Лучший тур в моей жизни. Гид был отличный, вид незабываемый!'
      },
      {
        id: uuid(),
        tour_id: this.testTours[1].id,
        user_id: customerUser.id,
        rating: 4,
        title: 'Хороший тур, но много народу',
        text: 'Природа красивая, но в группе было много людей.'
      }
    ];

    for (const review of reviews) {
      await this.client.query(
        `INSERT INTO reviews (
          id, tour_id, user_id, rating, title, text, 
          status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id) DO NOTHING`,
        [
          review.id,
          review.tour_id,
          review.user_id,
          review.rating,
          review.title,
          review.text,
          'published' // staging: автоматически published
        ]
      );

      console.log(`  ✅ Created review: "${review.title}"`);
    }
  }

  async seedBookings(): Promise<void> {
    console.log('\n📝 Seeding bookings...');

    const customerUser = this.testUsers.find(u => u.role === 'customer');
    if (!customerUser || this.testTours.length === 0) {
      console.log('  ⚠️  Skipping bookings: Missing user or tours');
      return;
    }

    const bookings = [
      {
        id: uuid(),
        user_id: customerUser.id,
        tour_id: this.testTours[0].id,
        booking_number: `BK-${Date.now().toString().slice(-8)}`,
        status: 'confirmed',
        participants: 2,
        total_price: this.testTours[0].price * 2,
        start_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 дней в будущем
      },
      {
        id: uuid(),
        user_id: customerUser.id,
        tour_id: this.testTours[1].id,
        booking_number: `BK-${(Date.now() + 1).toString().slice(-8)}`,
        status: 'pending',
        participants: 1,
        total_price: this.testTours[1].price,
        start_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 дней в будущем
      }
    ];

    for (const booking of bookings) {
      await this.client.query(
        `INSERT INTO bookings (
          id, user_id, tour_id, booking_number, status, 
          participants, total_price, start_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (booking_number) DO NOTHING`,
        [
          booking.id,
          booking.user_id,
          booking.tour_id,
          booking.booking_number,
          booking.status,
          booking.participants,
          booking.total_price,
          booking.start_date
        ]
      );

      console.log(`  ✅ Created booking: ${booking.booking_number}`);
    }
  }

  async run(): Promise<void> {
    console.log('🌱 Starting Staging Data Seeding...\n');

    try {
      await this.connect();

      // Clear existing data (optional, only in staging)
      if (process.env.STAGING_CLEAR_DATA === 'true') {
        console.log('⚠️  Clearing existing data...');
        await this.clearData();
      }

      // Seed all data
      await this.seedUsers();
      await this.seedTours();
      await this.seedTickets();
      await this.seedWishlists();
      await this.seedReviews();
      await this.seedBookings();

      // Print summary
      console.log('\n✅ Staging data seeded successfully!');
      console.log('\n📊 Summary:');
      console.log(`  • Users: ${this.testUsers.length}`);
      console.log(`  • Tours: ${this.testTours.length}`);
      console.log(`  • Tickets: ${this.testTickets.length}`);

      console.log('\n👤 Test accounts:');
      for (const user of this.testUsers) {
        console.log(`  • ${user.email} / ${user.password.substring(0, 5)}... (${user.role})`);
      }
    } catch (error) {
      console.error('❌ Error seeding data:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }

  private async clearData(): Promise<void> {
    await this.client.query('TRUNCATE TABLE reviews CASCADE');
    await this.client.query('TRUNCATE TABLE wishlists CASCADE');
    await this.client.query('TRUNCATE TABLE bookings CASCADE');
    await this.client.query('TRUNCATE TABLE support_tickets CASCADE');
    await this.client.query('TRUNCATE TABLE tours CASCADE');
    await this.client.query('TRUNCATE TABLE users CASCADE');
    console.log('  ✅ Tables cleared');
  }
}

// Run seeder
const seeder = new StagingDataSeeder();
seeder.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
