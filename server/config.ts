import 'dotenv/config';
import { z } from 'zod';

export function loadConfig(env = process.env) {
  return z
    .object({
      PORT: z.coerce.number().int().min(1).max(65535).default(3001),
      DATABASE_PATH: z.string().min(1).default('./data/dealership.db'),
      JWT_SECRET: z.string().min(32, 'Set JWT_SECRET in .env to at least 32 characters.'),
      CLIENT_IP_SOURCE: z.enum(['socket', 'railway']).default('socket'),
    })
    .parse(env);
}
