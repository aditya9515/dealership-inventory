import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { requireAdmin } from '../auth.js';
import { VehicleRepository } from './repository.js';
import { VehicleService } from './service.js';
import { movement, newVehicle, searchQuery, vehicleDetails, vehicleId } from './validation.js';

export function vehicleRouter(db: DatabaseSync) {
  const router = Router();
  const service = new VehicleService(db, new VehicleRepository(db));
  router.get(['/', '/search'], (req, res) => res.json(service.list(searchQuery.parse(req.query))));
  router.post('/', requireAdmin, (req, res) =>
    res.status(201).json(service.create(newVehicle.parse(req.body), res.locals.user.id)),
  );
  router.put('/:id', requireAdmin, (req, res) =>
    res.json(service.update(vehicleId.parse(req.params.id), vehicleDetails.parse(req.body))),
  );
  router.delete('/:id', requireAdmin, (req, res) => {
    service.delete(vehicleId.parse(req.params.id));
    res.status(204).send();
  });
  router.post('/:id/purchase', (req, res) =>
    res.json(
      service.move(
        vehicleId.parse(req.params.id),
        movement.parse(req.body ?? {}).quantity,
        'purchase',
        res.locals.user.id,
      ),
    ),
  );
  router.post('/:id/restock', requireAdmin, (req, res) =>
    res.json(
      service.move(
        vehicleId.parse(req.params.id),
        movement.parse(req.body ?? {}).quantity,
        'restock',
        res.locals.user.id,
      ),
    ),
  );
  return router;
}

export function inventoryRouter(db: DatabaseSync) {
  const router = Router();
  const service = new VehicleService(db, new VehicleRepository(db));
  router.get('/movements', requireAdmin, (_req, res) => res.json({ movements: service.history() }));
  return router;
}
