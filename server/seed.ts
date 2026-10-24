import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { openDatabase } from './database.js';
import { VehicleRepository } from './vehicles/repository.js';
import { VehicleService } from './vehicles/service.js';

const db = openDatabase(process.env.DATABASE_PATH ?? './data/dealership.db');
try {
  let adminId = '';
  for (const role of ['admin', 'customer'] as const) {
    const upper = role.toUpperCase();
    const email = z.string().email().parse(process.env[`SEED_${upper}_EMAIL`]).toLowerCase();
    const password = z.string().min(8).max(72).parse(process.env[`SEED_${upper}_PASSWORD`]);
    const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);
    if (existing && existing.role !== role)
      throw new Error(`Refusing to change the role of an existing account: ${email}`);
    const id = (existing?.id as string) ?? randomUUID();
    if (!existing)
      db.prepare(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      ).run(
        id,
        role === 'admin' ? 'Aditi Sharma' : 'Rohan Mehta',
        email,
        await bcrypt.hash(password, 12),
        role,
      );
    if (role === 'admin') adminId = id;
  }
  if ((db.prepare('SELECT COUNT(*) AS count FROM vehicles').get()!.count as number) === 0) {
    const service = new VehicleService(db, new VehicleRepository(db));
    const vehicles = [
      { make: 'Tata', model: 'Nexon', category: 'SUV', price: 850000, quantity: 8 },
      { make: 'Hyundai', model: 'Creta', category: 'SUV', price: 1125000, quantity: 5 },
      { make: 'Honda', model: 'City', category: 'Sedan', price: 1240000, quantity: 3 },
      { make: 'Maruti Suzuki', model: 'Swift', category: 'Hatchback', price: 649000, quantity: 12 },
      { make: 'Mahindra', model: 'Thar', category: 'SUV', price: 1499000, quantity: 2 },
      { make: 'Tata', model: 'Tiago EV', category: 'Electric', price: 799000, quantity: 0 },
    ];
    for (const vehicle of vehicles) service.create(vehicle, adminId);
  }
  console.log(
    'Demo accounts and inventory are ready. Existing accounts and vehicles were preserved.',
  );
} finally {
  db.close();
}
