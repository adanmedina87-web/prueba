
import React from 'react';
import { Product } from './types';

export const INITIAL_INVENTORY: Product[] = [
  {
    id: '1',
    name: 'Laptop Dell XPS 15',
    category: 'Electrónica',
    quantity: 12,
    location: 'Almacén Central - Pasillo A1',
    arrivalDate: '2023-11-15T09:00:00Z',
    responsible: 'Juan Pérez',
    sku: 'DELL-XPS-001'
  },
  {
    id: '2',
    name: 'Monitor LG 27" 4K',
    category: 'Periféricos',
    quantity: 25,
    location: 'Oficina Norte - Piso 2',
    arrivalDate: '2024-01-20T14:30:00Z',
    responsible: 'María García',
    sku: 'LG-MON-27'
  },
  {
    id: '3',
    name: 'Silla Ergonómica Pro',
    category: 'Mobiliario',
    quantity: 45,
    location: 'Almacén Secundario - Zona C',
    arrivalDate: '2023-08-05T11:00:00Z',
    responsible: 'Carlos Rodríguez',
    sku: 'CHAIR-ERG-PRO'
  },
  {
    id: '4',
    name: 'Teclado Mecánico RGB',
    category: 'Periféricos',
    quantity: 150,
    location: 'Almacén Central - Pasillo B2',
    arrivalDate: '2024-02-10T08:15:00Z',
    responsible: 'Ana Martínez',
    sku: 'KBD-MECH-RGB'
  },
  {
    id: '5',
    name: 'Router Cisco ISR 4331',
    category: 'Redes',
    quantity: 5,
    location: 'Data Center - Rack 4',
    arrivalDate: '2023-05-12T16:45:00Z',
    responsible: 'Luis Sánchez',
    sku: 'CSCO-RTR-4331'
  }
];

export const ICONS = {
  Dashboard: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Inventory: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Box: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
};
