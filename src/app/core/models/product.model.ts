/**
 * Definición del modelo de datos de Productos e Inventario Empresarial.
 * Representa la entidad principal consumida por la API Relacional (SQL simulada).
 */

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type ProductCategory = 'Electrónica' | 'Mobiliario' | 'Hardware' | 'Servicios' | 'Papelería';

export interface Product {
  id: string;
  sku: string; // Identificador único (validación asíncrona)
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  status: StockStatus;
  supplierEmail: string; // Validación de formato y comprobación
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilterOptions {
  searchQuery?: string;
  category?: string;
  status?: string;
  sortBy?: keyof Product;
  sortDirection?: 'asc' | 'desc';
}
