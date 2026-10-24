export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer';
}
export interface Session {
  user: User;
  token: string;
}
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
export interface Catalogue {
  vehicles: Vehicle[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: { models: number; totalUnits: number; inventoryValue: number; lowStock: number };
}
export interface Movement {
  id: string;
  vehicleId: string | null;
  vehicleName: string;
  actorName: string;
  kind: 'initial' | 'purchase' | 'restock';
  delta: number;
  quantityAfter: number;
  createdAt: string;
}
