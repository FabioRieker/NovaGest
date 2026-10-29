import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
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
  IonSelectOption,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  refreshOutline,
  downloadOutline,
  documentTextOutline,
  filterOutline,
  logOutOutline,
  gridOutline,
  listOutline,
  createOutline,
  trashOutline,
  eyeOutline,
  imageOutline,
  cubeOutline,
  closeOutline
} from 'ionicons/icons';
import { SqlRestService } from '../../core/services/sql-rest.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ExportService } from '../../core/services/export.service';
import { SupabaseRealtimeService } from '../../core/services/supabase-realtime.service';
import { TranslationService } from '../../core/services/translation.service';
import { DataTableComponent, TableColumn, TableActionPayload } from '../../shared/components/data-table/data-table.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LangSwitcherComponent } from '../../shared/components/lang-switcher/lang-switcher.component';
import { Product, StockStatus } from '../../core/models/product.model';

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
    IonSpinner,
    DataTableComponent,
    TranslatePipe,
    LangSwitcherComponent
  ]
})
export class ProductsPage implements OnInit {
  private sqlService = inject(SqlRestService);
  public authService = inject(AuthService);
  public translationService = inject(TranslationService);
  private notificationService = inject(NotificationService);
  private exportService = inject(ExportService);
  private realtimeService = inject(SupabaseRealtimeService);
  private router = inject(Router);

  public products = signal<Product[]>([]);
  public isLoading = signal(false);
  public selectedCategory = signal<string>('ALL');
  public selectedStatus = signal<string>('ALL');
  public currentSort = signal<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  public currentPage = signal<number>(1);
  public viewMode = signal<'table' | 'cards'>('table');
  public previewModalImage = signal<{ url: string; title: string } | null>(null);

  public onSortChange(sort: { column: string; direction: 'asc' | 'desc' }): void {
    this.currentSort.set(sort);
  }

  public onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  // Configuración de columnas reactivas con i18n para <app-data-table>
  public tableColumns = computed<TableColumn[]>(() => {
    // Reacciona en caliente al cambio de idioma
    this.translationService.currentLang();
    return [
      { key: 'imageUrl', label: this.translationService.t('TABLE.COLUMN_IMAGE'), sortable: false, type: 'image', width: '70px' },
      { key: 'sku', label: this.translationService.t('TABLE.COLUMN_SKU'), sortable: true, width: '130px' },
      { key: 'name', label: this.translationService.t('TABLE.COLUMN_NAME'), sortable: true },
      { key: 'category', label: this.translationService.t('TABLE.COLUMN_CATEGORY'), sortable: true, width: '130px' },
      { key: 'price', label: this.translationService.t('TABLE.COLUMN_PRICE'), sortable: true, type: 'currency', width: '110px' },
      { key: 'stock', label: this.translationService.t('TABLE.COLUMN_STOCK'), sortable: true, width: '90px' },
      { key: 'status', label: this.translationService.t('TABLE.COLUMN_STATUS'), sortable: true, type: 'badge', width: '130px' }
    ];
  });

  constructor() {
    addIcons({
      addOutline,
      refreshOutline,
      downloadOutline,
      documentTextOutline,
      filterOutline,
      logOutOutline,
      gridOutline,
      listOutline,
      createOutline,
      trashOutline,
      eyeOutline,
      imageOutline,
      cubeOutline,
      closeOutline
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

  public async confirmDelete(product: Product): Promise<void> {
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

  public getStatusLabel(status: string): string {
    return this.translationService.t('STATUS.' + status);
  }

  public getBadgeColor(status: string): string {
    switch (status) {
      case 'in_stock': return 'success';
      case 'low_stock': return 'warning';
      case 'out_of_stock': return 'danger';
      default: return 'medium';
    }
  }

  public openImagePreview(url: string | undefined, title: string, event?: Event): void {
    if (event) event.stopPropagation();
    if (!url) return;
    this.previewModalImage.set({ url, title });
  }

  public closeImagePreview(): void {
    this.previewModalImage.set(null);
  }

  public navigateToEdit(id: string): void {
    this.router.navigate(['/product-form', id]);
  }

  public openDetail(item: Product): void {
    this.notificationService.showToast(
      `Detalle: ${item.name} | SKU: ${item.sku} | Proveedor: ${item.supplierEmail} | Precio: ${item.price.toFixed(2)} €`,
      'primary'
    );
  }

  public exportPdf(): void {
    this.exportService.exportProductsToPdf(this.products(), 'Inventario de Productos y Material');
  }

  public exportCsv(): void {
    this.exportService.exportProductsToCsv(this.products(), 'Listado_Inventario_Productos');
  }
}
