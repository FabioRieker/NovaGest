import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { Product, ProductFilterOptions, StockStatus } from '../models/product.model';

const SQL_STORAGE_KEY = 'novagest_sql_products';

/**
 * Servicio que simula el consumo de una API REST conectada a Base de Datos Relacional (SQL).
 * Incluye persistencia local estructurada, validaciones de integridad referencial,
 * filtrado por índices, cálculo de agregaciones y latencia asíncrona realista.
 */
@Injectable({
  providedIn: 'root'
})
export class SqlRestService {

  private readonly initialSeed: Product[] = [
    {
      id: 'prod-001',
      sku: 'TECH-SRV-01',
      name: 'Servidor Rack Dell PowerEdge R750',
      category: 'Hardware',
      price: 3499.99,
      stock: 8,
      status: 'in_stock',
      supplierEmail: 'dell.enterprise@proveedor.es',
      description: 'Servidor 2U para virtualización de alta densidad con doble Intel Xeon.',
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-01-10T10:00:00Z'
    },
    {
      id: 'prod-002',
      sku: 'TECH-NB-02',
      name: 'Portátil Lenovo ThinkPad P1 Gen 6',
      category: 'Hardware',
      price: 2150.00,
      stock: 14,
      status: 'in_stock',
      supplierEmail: 'ventas@lenovobusiness.com',
      description: 'Estación de trabajo portátil para ingenieros con GPU NVIDIA RTX 4080.',
      createdAt: '2026-01-12T11:20:00Z',
      updatedAt: '2026-01-12T11:20:00Z'
    },
    {
      id: 'prod-003',
      sku: 'TECH-SW-03',
      name: 'Licencia Anual Cloud ERP Enterprise (x50 users)',
      category: 'Servicios',
      price: 5400.00,
      stock: 45,
      status: 'in_stock',
      supplierEmail: 'cloud.sales@novagest-saas.com',
      description: 'Suscripción corporativa para gestión de inventarios y contabilidad distribuida.',
      createdAt: '2026-01-15T09:15:00Z',
      updatedAt: '2026-01-15T09:15:00Z'
    },
    {
      id: 'prod-004',
      sku: 'MOB-CHR-04',
      name: 'Silla Ergonómica Herman Miller Aeron',
      category: 'Mobiliario',
      price: 1320.50,
      stock: 3,
      status: 'low_stock',
      supplierEmail: 'contacto@ergodesign.es',
      description: 'Silla ergonómica de oficina con soporte lumbar ajustable PostureFit SL.',
      createdAt: '2026-01-18T14:40:00Z',
      updatedAt: '2026-01-18T14:40:00Z'
    },
    {
      id: 'prod-005',
      sku: 'MOB-DSK-05',
      name: 'Escritorio Elevable Eléctrico Dual-Motor',
      category: 'Mobiliario',
      price: 680.00,
      stock: 12,
      status: 'in_stock',
      supplierEmail: 'info@standingdesk.pro',
      description: 'Mesa sit-stand con memorias de altura y estructura reforzada de acero.',
      createdAt: '2026-01-20T16:00:00Z',
      updatedAt: '2026-01-20T16:00:00Z'
    },
    {
      id: 'prod-006',
      sku: 'ELEC-MON-06',
      name: 'Monitor Curvo LG UltraWide 38WN95C',
      category: 'Electrónica',
      price: 1199.00,
      stock: 0,
      status: 'out_of_stock',
      supplierEmail: 'distribucion@lgdisplays.com',
      description: 'Panel IPS QHD+ con Thunderbolt 3 y cobertura DCI-P3 98%.',
      createdAt: '2026-01-22T08:30:00Z',
      updatedAt: '2026-01-22T08:30:00Z'
    },
    {
      id: 'prod-007',
      sku: 'ELEC-AUD-07',
      name: 'Auriculares Inalámbricos Sony WH-1000XM5',
      category: 'Electrónica',
      price: 349.00,
      stock: 22,
      status: 'in_stock',
      supplierEmail: 'pedidos@sonypro.es',
      description: 'Cancelación activa de ruido líder en el mercado para conferencias y trabajo remoto.',
      createdAt: '2026-01-25T13:10:00Z',
      updatedAt: '2026-01-25T13:10:00Z'
    },
    {
      id: 'prod-008',
      sku: 'PAP-ORG-08',
      name: 'Lote Papelería Corporativa y Cuadernos Ecológicos',
      category: 'Papelería',
      price: 185.00,
      stock: 4,
      status: 'low_stock',
      supplierEmail: 'pedidos@ecopaper.org',
      description: 'Kit de 50 cuadernos de bambú y bolígrafos reciclados con sello FSC.',
      createdAt: '2026-01-28T10:00:00Z',
      updatedAt: '2026-01-28T10:00:00Z'
    },
    {
      id: 'prod-009',
      sku: 'TECH-NET-09',
      name: 'Switch Gestionable Cisco Catalyst 9200L 48 Puertos',
      category: 'Hardware',
      price: 2890.00,
      stock: 6,
      status: 'in_stock',
      supplierEmail: 'sales@ciscopartner.com',
      description: 'Conmutador PoE+ Gigabit con enlaces ascendentes 4x10G para red troncal.',
      createdAt: '2026-02-02T12:00:00Z',
      updatedAt: '2026-02-02T12:00:00Z'
    },
    {
      id: 'prod-010',
      sku: 'SERV-MNT-10',
      name: 'Contrato Mantenimiento Preventivo Servidores 24/7',
      category: 'Servicios',
      price: 3200.00,
      stock: 10,
      status: 'in_stock',
      supplierEmail: 'soporte@infrastructurecare.es',
      description: 'SLA de respuesta en menos de 2 horas con sustitución de piezas críticas.',
      createdAt: '2026-02-05T15:30:00Z',
      updatedAt: '2026-02-05T15:30:00Z'
    }
  ];

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (!localStorage.getItem(SQL_STORAGE_KEY)) {
      localStorage.setItem(SQL_STORAGE_KEY, JSON.stringify(this.initialSeed));
    }
  }

  private getStoredProducts(): Product[] {
    try {
      const raw = localStorage.getItem(SQL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [...this.initialSeed];
    } catch {
      return [...this.initialSeed];
    }
  }

  private saveProducts(products: Product[]): void {
    localStorage.setItem(SQL_STORAGE_KEY, JSON.stringify(products));
  }

  /**
   * Obtiene todos los productos con soporte para filtrado, búsqueda y ordenación
   */
  public getProducts(filters?: ProductFilterOptions): Observable<Product[]> {
    return of(this.getStoredProducts()).pipe(
      delay(350), // Latencia de consulta SQL
      map(items => {
        let result = [...items];

        if (filters?.searchQuery) {
          const q = filters.searchQuery.toLowerCase().trim();
          result = result.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.supplierEmail.toLowerCase().includes(q)
          );
        }

        if (filters?.category && filters.category !== 'ALL') {
          result = result.filter(p => p.category === filters.category);
        }

        if (filters?.status && filters.status !== 'ALL') {
          result = result.filter(p => p.status === filters.status);
        }

        if (filters?.sortBy) {
          const key = filters.sortBy;
          const dir = filters.sortDirection === 'desc' ? -1 : 1;
          result.sort((a, b) => {
            const valA = a[key];
            const valB = b[key];
            if (typeof valA === 'string') {
              return dir * (valA as string).localeCompare(valB as string);
            }
            return dir * ((valA as number) - (valB as number));
          });
        }

        return result;
      })
    );
  }

  /**
   * Obtiene un producto por su clave primaria (ID)
   */
  public getProductById(id: string): Observable<Product> {
    return of(null).pipe(
      delay(250),
      map(() => {
        const item = this.getStoredProducts().find(p => p.id === id);
        if (!item) {
          throw new Error(`Producto con ID ${id} no encontrado en la base de datos.`);
        }
        return item;
      })
    );
  }

  /**
   * Inserta un nuevo producto garantizando unicidad de SKU
   */
  public createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Observable<Product> {
    return of(null).pipe(
      delay(450),
      map(() => {
        const items = this.getStoredProducts();
        const skuExists = items.some(p => p.sku.toUpperCase() === data.sku.toUpperCase());
        if (skuExists) {
          throw new Error(`Error de restricción UNIQUE: El SKU '${data.sku}' ya está registrado.`);
        }

        const newProduct: Product = {
          ...data,
          id: `prod-${Date.now().toString(36)}`,
          sku: data.sku.toUpperCase().trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        items.unshift(newProduct);
        this.saveProducts(items);
        return newProduct;
      })
    );
  }

  /**
   * Actualiza un producto existente
   */
  public updateProduct(id: string, changes: Partial<Product>): Observable<Product> {
    return of(null).pipe(
      delay(400),
      map(() => {
        const items = this.getStoredProducts();
        const index = items.findIndex(p => p.id === id);
        if (index === -1) {
          throw new Error(`Error: Producto con ID ${id} no existe.`);
        }

        if (changes.sku) {
          const skuConflict = items.some(p => p.id !== id && p.sku.toUpperCase() === changes.sku!.toUpperCase());
          if (skuConflict) {
            throw new Error(`Error de integridad: El SKU '${changes.sku}' ya está en uso.`);
          }
        }

        const updated: Product = {
          ...items[index],
          ...changes,
          sku: changes.sku ? changes.sku.toUpperCase().trim() : items[index].sku,
          updatedAt: new Date().toISOString()
        };

        items[index] = updated;
        this.saveProducts(items);
        return updated;
      })
    );
  }

  /**
   * Elimina un producto por su ID
   */
  public deleteProduct(id: string): Observable<boolean> {
    return of(null).pipe(
      delay(350),
      map(() => {
        const items = this.getStoredProducts();
        const filtered = items.filter(p => p.id !== id);
        if (filtered.length === items.length) {
          throw new Error(`Producto con ID ${id} no encontrado.`);
        }
        this.saveProducts(filtered);
        return true;
      })
    );
  }

  /**
   * Validador asíncrono para verificar unicidad de SKU
   */
  public checkSkuExists(sku: string, excludeId?: string): Observable<boolean> {
    return of(null).pipe(
      delay(300),
      map(() => {
        if (!sku || sku.trim().length === 0) return false;
        const normalized = sku.trim().toUpperCase();
        const items = this.getStoredProducts();
        return items.some(p => p.sku === normalized && p.id !== excludeId);
      })
    );
  }

  /**
   * Obtiene métricas agregadas SQL para el Dashboard
   */
  public getSummaryMetrics(): Observable<{
    totalProducts: number;
    totalInventoryValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    categoryCounts: Record<string, number>;
  }> {
    return this.getProducts().pipe(
      map(items => {
        const totalProducts = items.length;
        const totalInventoryValue = items.reduce((acc, p) => acc + (p.price * p.stock), 0);
        const lowStockCount = items.filter(p => p.status === 'low_stock').length;
        const outOfStockCount = items.filter(p => p.status === 'out_of_stock').length;

        const categoryCounts: Record<string, number> = {};
        for (const item of items) {
          categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        }

        return {
          totalProducts,
          totalInventoryValue,
          lowStockCount,
          outOfStockCount,
          categoryCounts
        };
      })
    );
  }
}
