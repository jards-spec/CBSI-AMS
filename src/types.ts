export interface Asset {
  id: string;
  name: string;
  tag: string;
  model: string;
  status: 'Available' | 'Maintenance' | 'Deployed';
  purchaseCost?: number;
}

export interface AuditLog {
  id: string;
  assetId: string;
  action: string;
  date: string;
  performedBy: string;
  details: string;
}

export interface Consumable {
  id: string;
  name: string;
  category: string;
  remaining: number;
  minStock: number;
}

export interface Accessory {
  id: string;
  name: string;
  type: string;
  available: number;
  assigned: number;
}

export interface License {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
  seats: number;
  assignedSeats: number;
  expiryDate: string;
  key: string;
}

export {};