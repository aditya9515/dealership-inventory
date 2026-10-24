import { z } from 'zod';

const price = z
  .number()
  .positive()
  .max(100000000)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    'Price must have at most two decimal places.',
  );
export const vehicleDetails = z
  .object({
    make: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(80),
    category: z.string().trim().min(1).max(40),
    price,
  })
  .strict();
export const newVehicle = vehicleDetails.extend({ quantity: z.number().int().min(0).max(1000000) });
export const movement = z
  .object({ quantity: z.number().int().min(1).max(1000000).default(1) })
  .strict();
export const vehicleId = z.string().uuid();
export const searchQuery = z
  .object({
    q: z.string().trim().max(100).optional(),
    make: z.string().trim().max(60).optional(),
    model: z.string().trim().max(80).optional(),
    category: z.string().trim().max(40).optional(),
    minPrice: z.coerce.number().min(0).max(100000000).optional(),
    maxPrice: z.coerce.number().min(0).max(100000000).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    sort: z.enum(['name', 'price_asc', 'price_desc', 'newest']).default('name'),
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(9),
  })
  .strict()
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    { message: 'Minimum price cannot exceed maximum price.', path: ['minPrice'] },
  );

export type VehicleInput = z.infer<typeof newVehicle>;
export type VehicleDetails = z.infer<typeof vehicleDetails>;
export type VehicleQuery = z.infer<typeof searchQuery>;
