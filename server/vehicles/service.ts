import type { DatabaseSync } from 'node:sqlite';
import { transaction } from '../database.js';
import { AppError } from '../errors.js';
import { VehicleRepository } from './repository.js';
import type { VehicleDetails, VehicleInput, VehicleQuery } from './validation.js';

export class VehicleService {
  constructor(
    private db: DatabaseSync,
    private repository: VehicleRepository,
  ) {}
  list(query: VehicleQuery) {
    return this.repository.list(query);
  }
  history() {
    return this.repository.history();
  }

  create(input: VehicleInput, actorId: string) {
    return transaction(this.db, () => {
      const vehicle = this.repository.create(input);
      this.repository.record(vehicle, actorId, 'initial', input.quantity);
      return vehicle;
    });
  }

  update(id: string, input: VehicleDetails) {
    const vehicle = this.repository.update(id, input);
    if (!vehicle) throw new AppError(404, 'NOT_FOUND', 'Vehicle not found.');
    return vehicle;
  }

  delete(id: string) {
    if (!this.repository.delete(id)) throw new AppError(404, 'NOT_FOUND', 'Vehicle not found.');
  }

  move(id: string, quantity: number, kind: 'purchase' | 'restock', actorId: string) {
    return transaction(this.db, () => {
      const delta = kind === 'purchase' ? -quantity : quantity;
      const vehicle = this.repository.changeStock(id, delta);
      if (!vehicle) {
        if (!this.repository.find(id)) throw new AppError(404, 'NOT_FOUND', 'Vehicle not found.');
        throw new AppError(
          409,
          'STOCK_CONFLICT',
          kind === 'purchase'
            ? 'Not enough vehicles in stock.'
            : 'Stock cannot exceed 1,000,000 units.',
        );
      }
      this.repository.record(vehicle, actorId, kind, delta);
      return vehicle;
    });
  }
}
