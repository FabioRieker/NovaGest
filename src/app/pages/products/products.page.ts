import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  refreshOutline,
  downloadOutline,
  documentTextOutline,
  filterOutline,
  logOutOutline
} from 'ionicons/icons';
import { SqlRestService } from '../../core/services/sql-rest.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ExportService } from '../../core/services/export.service';
import { RealtimeFirestoreService } from '../../core/services/nosql-realtime.service';
import { DataTableComponent, TableColumn, TableActionPayload } from '../../shared/components/data-table/data-table.component';
import { Product } from '../../core/models/product.model';

/**
 * Vista de Gestión de Catálogo e Inventario (FASE 2 & FASE 3).
 * Instancia el componente agnóstico <app-data-table> mediante @Input()
 * y reacciona a sus emisiones (@Output()).
 */
@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    DataTableComponent
  ]
})
export class ProductsPage implements OnInit {
  private sqlService = inject(SqlRestService);
  public authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private exportService = inject(ExportService);
  private realtimeService = inject(RealtimeFirestoreService);
  private router = inject(Router);

  public products = signal<Product[]>([]);
  public isLoading = signal(false);
  public selectedCategory = signal<string>('ALL');
  public selectedStatus = signal<string>('ALL');

  // Configuración de columnas para <app-data-table>
  public tableColumns: TableColumn[] = [
    { key: 'sku', label: 'SKU / Código', sortable: true, width: '130px' },
    { key: 'name', label: 'Nombre de Artículo', sortable: true },
    { key: 'category', label: 'Categoría', sortable: true, width: '130px' },
    { key: 'price', label: 'Precio', sortable: true, type: 'currency', width: '110px' },
    { key: 'stock', label: 'Stock', sortable: true, width: '90px' },
    { key: 'status', label: 'Disponibilidad', sortable: true, type: 'badge', width: '130px' }
  ];

  constructor() {
    addIcons({
      addOutline,
      refreshOutline,
      downloadOutline,
      documentTextOutline,
      filterOutline,
      logOutOutline
    });
  }

  public logout(): void {
    this.authService.logout();
    this.notificationService.showToast('Sesión cerrada correctamente.', 'primary');
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    this.fetchProducts();
  }

  public fetchProducts(): void {
    this.isLoading.set(true);
    this.sqlService.getProducts({
      category: this.selectedCategory(),
      status: this.selectedStatus()
    }).subscribe({
      next: (data) => {
        this.products.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.showToast('Error cargando el catálogo de la API SQL.', 'danger');
      }
    });
  }

  public onFilterChange(): void {
    this.fetchProducts();
  }

  public navigateToCreate(): void {
    this.router.navigate(['/product-form']);
  }

  public onTableAction(event: TableActionPayload<Product>): void {
    const { action, item } = event;

    if (action === 'edit') {
      this.router.navigate(['/product-form', item.id]);
    } else if (action === 'delete') {
      this.confirmDelete(item);
    } else if (action === 'view') {
      this.notificationService.showToast(
        `Detalle: ${item.name} | Proveedor: ${item.supplierEmail} | Precio: ${item.price.toFixed(2)} €`,
        'primary'
      );
    }
  }

  private async confirmDelete(product: Product): Promise<void> {
    const confirmed = await this.notificationService.confirm(
      'Eliminar Producto',
      `¿Está seguro de que desea eliminar permanentemente '${product.name}' (SKU: ${product.sku})?`
    );

    if (confirmed) {
      this.sqlService.deleteProduct(product.id).subscribe({
        next: () => {
          this.notificationService.showToast(`Producto '${product.name}' eliminado con éxito.`, 'success');
          this.realtimeService.logActivity(
            'DELETE',
            'PRODUCT',
            `Eliminación del producto SKU: ${product.sku} (${product.name})`,
            'warning',
            product.id
          );
          this.fetchProducts();
        },
        error: (err) => {
          this.notificationService.showToast(err.message || 'Error eliminando el producto.', 'danger');
        }
      });
    }
  }

  public exportPdf(): void {
    this.exportService.exportProductsToPdf(this.products(), 'Inventario de Productos y Material');
  }

  public exportCsv(): void {
    this.exportService.exportProductsToCsv(this.products(), 'Listado_Inventario_Productos');
  }
}
