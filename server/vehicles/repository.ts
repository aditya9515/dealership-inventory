import { randomUUID } from 'node:crypto';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type { VehicleDetails, VehicleInput, VehicleQuery } from './validation.js';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}
interface VehicleRow {
  id: string;
  make: string;
  model: string;
  category: string;
  price_paise: number;
  quantity: number;
  created_at: string;
  updated_at: string;
}
function mapVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    category: row.category,
    price: row.price_paise / 100,
    quantity: row.quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
const orderBy = {
  name: 'make COLLATE NOCASE, model COLLATE NOCASE',
  price_asc: 'price_paise ASC',
  price_desc: 'price_paise DESC',
  newest: 'created_at DESC',
};
const like = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;

export class VehicleRepository {
  constructor(private db: DatabaseSync) {}

  find(id: string) {
    const row = this.db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as unknown as
      | VehicleRow
      | undefined;
    return row ? mapVehicle(row) : undefined;
  }

  list(query: VehicleQuery) {
    const clauses: string[] = [];
    const values: SQLInputValue[] = [];
    for (const key of ['make', 'model'] as const) {
      if (query[key]) {
        clauses.push(`${key} LIKE ? ESCAPE '\\'`);
        values.push(like(query[key]));
      }
    }
    if (query.category) {
      clauses.push('category = ? COLLATE NOCASE');
      values.push(query.category);
    }
    if (query.q) {
      clauses.push(
        "(make LIKE ? ESCAPE '\\' OR model LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')",
      );
      values.push(like(query.q), like(query.q), like(query.q));
    }
    if (query.minPrice !== undefined) {
      clauses.push('price_paise >= ?');
      values.push(Math.ceil(query.minPrice * 100 - 0.000001));
    }
    if (query.maxPrice !== undefined) {
      clauses.push('price_paise <= ?');
      values.push(Math.floor(query.maxPrice * 100 + 0.000001));
    }
    if (query.inStock === 'true') clauses.push('quantity > 0');
    if (query.inStock === 'false') clauses.push('quantity = 0');
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const total = this.db.prepare(`SELECT COUNT(*) AS total FROM vehicles ${where}`).get(...values)!
      .total as number;
    const rows = this.db
      .prepare(
        `SELECT * FROM vehicles ${where} ORDER BY ${orderBy[query.sort]}, id LIMIT ? OFFSET ?`,
      )
      .all(...values, query.pageSize, (query.page - 1) * query.pageSize) as unknown as VehicleRow[];
    const summary = this.db
      .prepare(
        `SELECT COUNT(*) AS models, COALESCE(SUM(quantity), 0) AS totalUnits,
      COALESCE(SUM(price_paise * quantity), 0) / 100.0 AS inventoryValue,
      COALESCE(SUM(CASE WHEN quantity <= 2 THEN 1 ELSE 0 END), 0) AS lowStock FROM vehicles`,
      )
      .get();
    return {
      vehicles: rows.map(mapVehicle),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
      summary,
    };
  }

  create(input: VehicleInput) {
    const id = randomUUID();
    this.db
      .prepare(
        'INSERT INTO vehicles (id, make, model, category, price_paise, quantity) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        id,
        input.make,
        input.model,
        input.category,
        Math.round(input.price * 100),
        input.quantity,
      );
    return this.find(id)!;
  }

  update(id: string, input: VehicleDetails) {
    this.db
      .prepare(
        "UPDATE vehicles SET make = ?, model = ?, category = ?, price_paise = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
      )
      .run(input.make, input.model, input.category, Math.round(input.price * 100), id);
    return this.find(id);
  }

  delete(id: string) {
    return this.db.prepare('DELETE FROM vehicles WHERE id = ?').run(id).changes > 0;
  }

  changeStock(id: string, delta: number) {
    // The predicate and write are one SQL operation, even across separate connections.
    const row = this.db
      .prepare(
        `UPDATE vehicles SET quantity = quantity + ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ? AND quantity + ? BETWEEN 0 AND 1000000 RETURNING *`,
      )
      .get(delta, id, delta) as unknown as VehicleRow | undefined;
    return row ? mapVehicle(row) : undefined;
  }

  record(
    vehicle: Vehicle,
    actorId: string,
    kind: 'initial' | 'purchase' | 'restock',
    delta: number,
  ) {
    this.db
      .prepare(
        'INSERT INTO inventory_movements (id, vehicle_id, vehicle_name, actor_id, kind, delta, quantity_after) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        randomUUID(),
        vehicle.id,
        `${vehicle.make} ${vehicle.model}`,
        actorId,
        kind,
        delta,
        vehicle.quantity,
      );
  }

  history() {
    return this.db
      .prepare(
        `SELECT m.id, m.vehicle_id AS vehicleId, m.vehicle_name AS vehicleName,
      u.name AS actorName, m.kind, m.delta, m.quantity_after AS quantityAfter, m.created_at AS createdAt
      FROM inventory_movements m JOIN users u ON u.id = m.actor_id ORDER BY m.created_at DESC, m.rowid DESC LIMIT 50`,
      )
      .all();
  }
}
