import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonSearchbar,
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowUpOutline,
  arrowDownOutline,
  chevronBackOutline,
  chevronForwardOutline,
  createOutline,
  trashOutline,
  eyeOutline,
  swapVerticalOutline,
  imageOutline,
  closeOutline
} from 'ionicons/icons';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'currency' | 'badge' | 'date' | 'image';
  width?: string;
}

export interface TableActionPayload<T = any> {
  action: 'view' | 'edit' | 'delete';
  item: T;
}

/**
 * Componente Visual Personalizado 1: Tabla de Datos Avanzada Reutilizable (RA 3).
 * Completamente agnóstico de la vista contenedora, configurable mediante @Input()
 * y emisor de interacciones mediante @Output().
 * Cumple con ChangeDetectionStrategy.OnPush y normativas WCAG de accesibilidad.
 */
@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonSearchbar,
    IonButton,
    IonIcon,
    IonSpinner,
    IonBadge
  ]
})
export class DataTableComponent<T = any> implements OnInit, OnChanges, OnDestroy {
  @Input() columns: TableColumn[] = [];
  @Input() data: readonly T[] = [];
  @Input() pageSize = 6;
  @Input() searchPlaceholder = 'Buscar registros...';
  @Input() loading = false;
  @Input() emptyMessage = 'No se encontraron registros.';
  @Input() showActions = true;
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Input() canView = true;
  @Input() badgeColorMap: Record<string, string> = {
    in_stock: 'success',
    low_stock: 'warning',
    out_of_stock: 'danger',
    admin: 'primary',
    user: 'medium'
  };

  @Output() rowClick = new EventEmitter<T>();
  @Output() actionClick = new EventEmitter<TableActionPayload<T>>();
  @Output() sortChange = new EventEmitter<{ column: string; direction: 'asc' | 'desc' }>();
  @Output() pageChange = new EventEmitter<number>();

  // Estado interno de la tabla
  public searchTerm = '';
  public currentPage = 1;
  public sortColumn = '';
  public sortDirection: 'asc' | 'desc' = 'asc';

  public filteredData: any[] = [];
  public paginatedData: any[] = [];
  public totalPages = 1;

  private searchSubject = new Subject<string>();
  private subscriptions = new Subscription();

  public previewModal = signal<{ url: string; title: string } | null>(null);

  constructor() {
    addIcons({
      arrowUpOutline,
      arrowDownOutline,
      chevronBackOutline,
      chevronForwardOutline,
      createOutline,
      trashOutline,
      eyeOutline,
      swapVerticalOutline,
      imageOutline,
      closeOutline
    });
  }

  ngOnInit(): void {
    // Configurar debounce en la barra de búsqueda para evitar recomputaciones innecesarias
    this.subscriptions.add(
      this.searchSubject.pipe(
        debounceTime(250),
        distinctUntilChanged()
      ).subscribe(term => {
        this.searchTerm = term;
        this.currentPage = 1;
        this.applyFilterAndPagination();
      })
    );

    this.applyFilterAndPagination();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['pageSize']) {
      this.applyFilterAndPagination();
    }
  }

  ngOnDestroy(): void {
    // Evitar memory leaks liberando suscripciones de Observables
    this.subscriptions.unsubscribe();
  }

  public onSearchInput(event: any): void {
    const val = event.target?.value ?? '';
    this.searchSubject.next(val);
  }

  public onSort(col: TableColumn): void {
    if (!col.sortable) return;

    if (this.sortColumn === col.key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = col.key;
      this.sortDirection = 'asc';
    }

    this.sortChange.emit({ column: this.sortColumn, direction: this.sortDirection });
    this.applyFilterAndPagination();
  }

  public setPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.pageChange.emit(this.currentPage);
    this.applyPaginationOnly();
  }

  public onRowSelect(item: any): void {
    this.rowClick.emit(item);
  }

  public triggerAction(action: 'view' | 'edit' | 'delete', item: any, event: Event): void {
    event.stopPropagation();
    this.actionClick.emit({ action, item });
  }

  private applyFilterAndPagination(): void {
    let result = [...(this.data || [])];

    // Búsqueda en todos los campos visibles
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      result = result.filter(item =>
        this.columns.some(col => {
          const val = item[col.key];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        })
      );
    }

    // Ordenación
    if (this.sortColumn) {
      const dir = this.sortDirection === 'desc' ? -1 : 1;
      result.sort((a, b) => {
        const valA = a[this.sortColumn];
        const valB = b[this.sortColumn];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return dir * (valA - valB);
        }
        return dir * String(valA || '').localeCompare(String(valB || ''));
      });
    }

    this.filteredData = result;
    this.totalPages = Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));

    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }

    this.applyPaginationOnly();
  }

  private applyPaginationOnly(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedData = this.filteredData.slice(start, end);
  }

  public getBadgeColor(status: string): string {
    return this.badgeColorMap[status] || 'secondary';
  }

  public formatCellValue(item: any, col: TableColumn): string {
    const val = item[col.key];
    if (val === null || val === undefined) return '-';
    if (col.type === 'currency') {
      return `${Number(val).toFixed(2)} €`;
    }
    if (col.type === 'date') {
      try {
        return new Date(val).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  public openImagePreview(url: string, title: string, event: Event): void {
    event.stopPropagation();
    if (url) {
      this.previewModal.set({ url, title });
    }
  }

  public closeImagePreview(): void {
    this.previewModal.set(null);
  }
}
