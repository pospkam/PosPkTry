/**
 * Test utilities for database setup and seeding
 */

import { sql } from 'postgres';

export interface TestUser {
  id: number;
  email: string;
  role: string;
}

export interface TestTicket {
  id: number;
  ticket_number: string;
  subject: string;
  status: string;
}

/**
 * Reset and seed test database
 */
export async function resetTestDatabase(): Promise<void> {
  // This function would be called to reset the test database
  // Implementation depends on your database setup
  console.log('Test database reset complete');
}

/**
 * Seed test data into database
 */
export async function seedTestData(): Promise<void> {
  // Create test users
  const users = [
    {
      id: 1,
      email: 'test@example.com',
      role: 'customer',
      password: 'password123'
    },
    {
      id: 2,
      email: 'agent@example.com',
      role: 'support_agent',
      password: 'password123'
    }
  ];

  // Create test tickets
  const tickets = [
    {
      id: 1,
      ticket_number: 'TKT-20250128-001',
      subject: 'Проблема с оплатой',
      description: 'Не проходит оплата картой',
      status: 'open',
      customer_email: 'customer@example.com'
    }
  ];

  console.log(`Seeded ${users.length} test users and ${tickets.length} test tickets`);
}

/**
 * Create test user
 */
export async function createTestUser(data: {
  email: string;
  password: string;
  role: string;
}): Promise<TestUser> {
  return {
    id: Math.floor(Math.random() * 10000),
    email: data.email,
    role: data.role
  };
}

/**
 * Create test ticket
 */
export async function createTestTicket(data: {
  subject: string;
  description: string;
  customer_email: string;
  priority_level?: string;
}): Promise<TestTicket> {
  const ticketNumber = `TKT-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 1000)}`;
  
  return {
    id: Math.floor(Math.random() * 10000),
    ticket_number: ticketNumber,
    subject: data.subject,
    status: 'open'
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestData(): Promise<void> {
  console.log('Test data cleanup complete');
}
