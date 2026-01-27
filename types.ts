
export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  location: string;
  arrivalDate: string; // ISO string
  responsible: string;
  sku: string;
}

export interface InventoryState {
  items: Product[];
  sourceLink: string;
  lastUpdated: string;
}

export enum AppSection {
  DASHBOARD = 'DASHBOARD',
  QUERY = 'QUERY',
  INVENTORY = 'INVENTORY',
  SETTINGS = 'SETTINGS'
}
