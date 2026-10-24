import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/database.js';

const secret = 'test-secret-that-is-at-least-32-characters';
const vehicle = { make: 'Tata', model: 'Nexon', category: 'SUV', price: 850000.25, quantity: 3 };

describe('vehicle catalogue and inventory', () => {
  let dir: string;
  let db: ReturnType<typeof openDatabase>;
  let app: ReturnType<typeof createApp>;
  let admin: string;
  let customer: string;
  const createVehicle = async (data = vehicle) =>
    (
      await request(app)
        .post('/api/vehicles')
        .auth(admin, { type: 'bearer' })
        .send(data)
        .expect(201)
    ).body;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dealership-vehicles-'));
    db = openDatabase(join(dir, 'test.db'));
    for (const role of ['admin', 'customer']) {
      db.prepare(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      ).run(role, role, `${role}@example.com`, 'fixture-not-used-for-login', role);
    }
    admin = jwt.sign({}, secret, { subject: 'admin', expiresIn: '1h' });
    customer = jwt.sign({}, secret, { subject: 'customer', expiresIn: '1h' });
    app = createApp({ db, jwtSecret: secret });
  });
  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates a vehicle with a unique ID and stores money as integer paise', async () => {
    const result = await createVehicle();
    expect(result).toMatchObject(vehicle);
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(db.prepare('SELECT price_paise FROM vehicles').get()!.price_paise).toBe(85000025);
  });

  it('lists vehicles with pagination and overall inventory totals', async () => {
    await createVehicle();
    await createVehicle({ ...vehicle, model: 'Punch', quantity: 0, price: 600000 });
    const result = await request(app)
      .get('/api/vehicles?page=1&pageSize=1')
      .auth(customer, { type: 'bearer' })
      .expect(200);
    expect(result.body.vehicles).toHaveLength(1);
    expect(result.body.pagination).toMatchObject({ total: 2, page: 1, pageSize: 1, totalPages: 2 });
    expect(result.body.summary).toMatchObject({
      models: 2,
      totalUnits: 3,
      inventoryValue: 2550000.75,
      lowStock: 1,
    });
  });

  it('combines case-insensitive make/model/category and inclusive price filters', async () => {
    const first = await createVehicle();
    await createVehicle({
      ...vehicle,
      make: 'Honda',
      model: 'City',
      category: 'Sedan',
      price: 1200000,
    });
    const result = await request(app)
      .get(
        '/api/vehicles/search?make=tAtA&model=nex&category=suv&minPrice=850000.25&maxPrice=850000.25',
      )
      .auth(customer, { type: 'bearer' })
      .expect(200);
    expect(result.body.vehicles.map((v: { id: string }) => v.id)).toEqual([first.id]);
  });

  it('supports free text search, empty results, and safe literal wildcard input', async () => {
    await createVehicle();
    const found = await request(app)
      .get('/api/vehicles/search?q=Nexon')
      .auth(customer, { type: 'bearer' })
      .expect(200);
    expect(found.body.vehicles).toHaveLength(1);
    for (const q of ['missing', '%', "' OR 1=1 --"]) {
      const result = await request(app)
        .get('/api/vehicles/search')
        .query({ q })
        .auth(customer, { type: 'bearer' })
        .expect(200);
      expect(result.body.vehicles).toHaveLength(0);
    }
  });

  it('sorts by price and filters stock availability', async () => {
    await createVehicle();
    await createVehicle({ ...vehicle, model: 'Punch', price: 600000, quantity: 0 });
    const sorted = await request(app)
      .get('/api/vehicles?sort=price_asc')
      .auth(customer, { type: 'bearer' })
      .expect(200);
    expect(sorted.body.vehicles.map((v: { model: string }) => v.model)).toEqual(['Punch', 'Nexon']);
    const inStock = await request(app)
      .get('/api/vehicles?inStock=true')
      .auth(customer, { type: 'bearer' })
      .expect(200);
    expect(inStock.body.vehicles).toHaveLength(1);
  });

  it.each([
    { price: -1 },
    { price: 1.234 },
    { quantity: -1 },
    { quantity: 1.5 },
    { make: '' },
    { category: '' },
    { extra: 'ignored?' },
  ])('rejects invalid vehicles: %j', async (change) => {
    await request(app)
      .post('/api/vehicles')
      .auth(admin, { type: 'bearer' })
      .send({ ...vehicle, ...change })
      .expect(400);
  });

  it.each([
    'minPrice=20&maxPrice=10',
    'minPrice=abc',
    'page=0',
    'pageSize=101',
    'sort=DROP',
    'inStock=maybe',
  ])('rejects invalid search queries: %s', async (query) => {
    await request(app)
      .get(`/api/vehicles/search?${query}`)
      .auth(customer, { type: 'bearer' })
      .expect(400);
  });

  it('updates details but requires the restock/purchase endpoints for stock changes', async () => {
    const created = await createVehicle();
    const result = await request(app)
      .put(`/api/vehicles/${created.id}`)
      .auth(admin, { type: 'bearer' })
      .send({ make: 'Tata', model: 'Nexon EV', category: 'Electric', price: 1500000 })
      .expect(200);
    expect(result.body).toMatchObject({ model: 'Nexon EV', category: 'Electric', quantity: 3 });
    await request(app)
      .put(`/api/vehicles/${created.id}`)
      .auth(admin, { type: 'bearer' })
      .send({ ...vehicle, quantity: 100 })
      .expect(400);
  });

  it('purchases a default single unit and records the actor and resulting stock', async () => {
    const created = await createVehicle();
    const result = await request(app)
      .post(`/api/vehicles/${created.id}/purchase`)
      .auth(customer, { type: 'bearer' })
      .send({})
      .expect(200);
    expect(result.body.quantity).toBe(2);
    const history = await request(app)
      .get('/api/inventory/movements')
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(history.body.movements[0]).toMatchObject({
      kind: 'purchase',
      delta: -1,
      quantityAfter: 2,
      actorName: 'customer',
      vehicleName: 'Tata Nexon',
    });
  });

  it('rejects overselling and keeps stock unchanged', async () => {
    const created = await createVehicle({ ...vehicle, quantity: 1 });
    await request(app)
      .post(`/api/vehicles/${created.id}/purchase`)
      .auth(customer, { type: 'bearer' })
      .send({ quantity: 2 })
      .expect(409);
    expect(db.prepare('SELECT quantity FROM vehicles').get()!.quantity).toBe(1);
  });

  it('allows only one buyer to purchase the last available unit', async () => {
    const created = await createVehicle({ ...vehicle, quantity: 1 });
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post(`/api/vehicles/${created.id}/purchase`)
          .auth(customer, { type: 'bearer' })
          .send({ quantity: 1 }),
      ),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect(db.prepare('SELECT quantity FROM vehicles').get()!.quantity).toBe(0);
  });

  it('restocks for an administrator', async () => {
    const created = await createVehicle({ ...vehicle, quantity: 0 });
    const result = await request(app)
      .post(`/api/vehicles/${created.id}/restock`)
      .auth(admin, { type: 'bearer' })
      .send({ quantity: 5 })
      .expect(200);
    expect(result.body.quantity).toBe(5);
  });

  it.each([0, -1, 1.5, '2', 1000001])('rejects invalid movement quantity: %s', async (quantity) => {
    const created = await createVehicle();
    for (const action of ['purchase', 'restock']) {
      await request(app)
        .post(`/api/vehicles/${created.id}/${action}`)
        .auth(admin, { type: 'bearer' })
        .send({ quantity })
        .expect(400);
    }
  });

  it('rejects stock overflow', async () => {
    const created = await createVehicle({ ...vehicle, quantity: 1000000 });
    await request(app)
      .post(`/api/vehicles/${created.id}/restock`)
      .auth(admin, { type: 'bearer' })
      .send({ quantity: 1 })
      .expect(409);
  });

  it('rolls back the stock change if recording the movement fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const created = await createVehicle();
    db.exec(
      "CREATE TRIGGER fail_movement BEFORE INSERT ON inventory_movements BEGIN SELECT RAISE(ABORT, 'test failure'); END;",
    );
    await request(app)
      .post(`/api/vehicles/${created.id}/purchase`)
      .auth(customer, { type: 'bearer' })
      .send({})
      .expect(500);
    expect(db.prepare('SELECT quantity FROM vehicles').get()!.quantity).toBe(3);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('blocks customers from catalogue mutation, restock, delete and admin history', async () => {
    const created = await createVehicle();
    await request(app)
      .post('/api/vehicles')
      .auth(customer, { type: 'bearer' })
      .send(vehicle)
      .expect(403);
    await request(app)
      .put(`/api/vehicles/${created.id}`)
      .auth(customer, { type: 'bearer' })
      .send(vehicle)
      .expect(403);
    await request(app)
      .post(`/api/vehicles/${created.id}/restock`)
      .auth(customer, { type: 'bearer' })
      .send({ quantity: 2 })
      .expect(403);
    await request(app)
      .delete(`/api/vehicles/${created.id}`)
      .auth(customer, { type: 'bearer' })
      .expect(403);
    await request(app)
      .get('/api/inventory/movements')
      .auth(customer, { type: 'bearer' })
      .expect(403);
  });

  it('deletes vehicles but preserves movement snapshots', async () => {
    const created = await createVehicle();
    await request(app)
      .post(`/api/vehicles/${created.id}/purchase`)
      .auth(customer, { type: 'bearer' })
      .send({})
      .expect(200);
    await request(app)
      .delete(`/api/vehicles/${created.id}`)
      .auth(admin, { type: 'bearer' })
      .expect(204);
    expect(db.prepare('SELECT * FROM vehicles').all()).toHaveLength(0);
    expect(
      db.prepare('SELECT vehicle_name FROM inventory_movements WHERE kind = ?').get('purchase')!
        .vehicle_name,
    ).toBe('Tata Nexon');
  });

  it('returns not found for missing vehicles and validates IDs', async () => {
    const id = randomUUID();
    await request(app)
      .put(`/api/vehicles/${id}`)
      .auth(admin, { type: 'bearer' })
      .send({ make: 'Tata', model: 'X', category: 'SUV', price: 1 })
      .expect(404);
    await request(app).delete(`/api/vehicles/${id}`).auth(admin, { type: 'bearer' }).expect(404);
    await request(app)
      .post(`/api/vehicles/${id}/purchase`)
      .auth(customer, { type: 'bearer' })
      .send({})
      .expect(404);
    await request(app).delete('/api/vehicles/invalid').auth(admin, { type: 'bearer' }).expect(400);
  });
});
