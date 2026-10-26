import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  refreshOutline,
  downloadOutline,
  statsChartOutline,
  cubeOutline,
  cashOutline,
  alertCircleOutline,
  timeOutline,
  sparklesOutline,
  documentTextOutline,
  logOutOutline
} from 'ionicons/icons';
import { forkJoin, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import { SqlRestService } from '../../core/services/sql-rest.service';
import { RealtimeFirestoreService } from '../../core/services/nosql-realtime.service';
import { ExportService } from '../../core/services/export.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Router } from '@angular/router';
import { StatWidgetComponent } from '../../shared/components/stat-widget/stat-widget.component';
import { Product } from '../../core/models/product.model';
import { AuditLogDocument } from '../../core/models/audit-log.model';

// Registrar componentes de Chart.js
Chart.register(...registerables);

/**
 * Cuadro de Mando Ejecutivo / Dashboard (FASE 3 - Paso 3.2).
 * Exclusivo para rol Administrador.
 * Implementa concurrencia asíncrona mediante forkJoin para consumir simultáneamente
 * la API REST SQL y el flujo de documentos NoSQL.
 * Gráficos interactivos Chart.js con filtros reactivos en tiempo real.
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonSpinner,
    IonBadge,
    StatWidgetComponent
  ]
})
export class DashboardPage implements OnInit, OnDestroy {
  @ViewChild('revenueBarChartCanvas') revenueBarChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryDoughnutChartCanvas') categoryDoughnutChartCanvas!: ElementRef<HTMLCanvasElement>;

  private sqlService = inject(SqlRestService);
  private realtimeService = inject(RealtimeFirestoreService);
  private exportService = inject(ExportService);
  public authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  public isLoading = signal(true);
  public filterCategory = signal<string>('ALL');
  public filterPeriod = signal<string>('30d');

  // Datos de métricas consolidadas
  public totalProducts = signal(0);
  public totalInventoryValue = signal(0);
  public lowStockCount = signal(0);
  public outOfStockCount = signal(0);
  public allProducts = signal<Product[]>([]);
  public recentLogs = signal<AuditLogDocument[]>([]);

  // Instancias de Chart.js
  private revenueChart: Chart | null = null;
  private categoryChart: Chart | null = null;
  private subscriptions = new Subscription();

  constructor() {
    addIcons({
      refreshOutline,
      downloadOutline,
      statsChartOutline,
      cubeOutline,
      cashOutline,
      alertCircleOutline,
      timeOutline,
      sparklesOutline,
      documentTextOutline,
      logOutOutline
    });
  }

  public logout(): void {
    this.authService.logout();
    this.notificationService.showToast('Sesión cerrada correctamente.', 'primary');
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    this.loadConsolidatedData();

    // Suscripción al stream NoSQL en tiempo real para mantener eventos sincronizados
    this.subscriptions.add(
      this.realtimeService.documents$.subscribe(docs => {
        this.recentLogs.set(docs.slice(0, 5));
      })
    );
  }

  ngOnDestroy(): void {
    // Destruir instancias de Chart.js y desuscribir observables para evitar memory leaks
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }
    if (this.categoryChart) {
      this.categoryChart.destroy();
      this.categoryChart = null;
    }
    this.subscriptions.unsubscribe();
  }

  /**
   * Concurrencia y Asincronía Avanzada: forkJoin orquesta la carga simultánea
   * de la fuente SQL (Productos y métricas) y la fuente NoSQL (Auditoría en tiempo real).
   */
  public loadConsolidatedData(): void {
    this.isLoading.set(true);

    this.subscriptions.add(
      forkJoin({
        products: this.sqlService.getProducts(),
        metrics: this.sqlService.getSummaryMetrics(),
        recentAlerts: this.realtimeService.getRecentAlerts().pipe(take(1))
      }).subscribe({
        next: ({ products, metrics }) => {
          this.allProducts.set(products);
          this.totalProducts.set(metrics.totalProducts);
          this.totalInventoryValue.set(metrics.totalInventoryValue);
          this.lowStockCount.set(metrics.lowStockCount);
          this.outOfStockCount.set(metrics.outOfStockCount);

          this.isLoading.set(false);

          // Inicializar o refrescar gráficos
          setTimeout(() => {
            this.renderCharts();
          }, 100);
        },
        error: (err) => {
          console.error('Error cargando fuentes de datos consolidadas:', err);
          this.isLoading.set(false);
        }
      })
    );
  }

  public onFilterChange(): void {
    this.renderCharts();
  }

  private renderCharts(): void {
    this.renderRevenueBarChart();
    this.renderCategoryDoughnutChart();
  }

  private renderRevenueBarChart(): void {
    if (!this.revenueBarChartCanvas) return;

    if (this.revenueChart) {
      this.revenueChart.destroy();
    }

    const ctx = this.revenueBarChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Generar datos contextualizados según período seleccionado
    const labels = this.filterPeriod() === '7d'
      ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
      : ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'];

    const salesData = this.filterPeriod() === '7d'
      ? [3200, 4100, 2900, 5200, 6100, 3800, 4400]
      : [18500, 22100, 19400, 25800, 28900, 31200, 29800, 33500, 36200, 41000];

    const costsData = this.filterPeriod() === '7d'
      ? [1500, 1800, 1400, 2100, 2400, 1600, 1900]
      : [9200, 10500, 9800, 12400, 13100, 14500, 13800, 15200, 16100, 18000];

    this.revenueChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos (€)',
            data: salesData,
            backgroundColor: '#e11d48',
            borderRadius: 8
          },
          {
            label: 'Costes Operativos (€)',
            data: costsData,
            backgroundColor: '#94a3b8',
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'inherit', size: 12, weight: 600 } }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => `${val} €`
            }
          }
        }
      }
    });
  }

  private renderCategoryDoughnutChart(): void {
    if (!this.categoryDoughnutChartCanvas) return;

    if (this.categoryChart) {
      this.categoryChart.destroy();
    }

    const ctx = this.categoryDoughnutChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const products = this.allProducts();
    const categories = ['Hardware', 'Electrónica', 'Mobiliario', 'Servicios', 'Papelería'];
    const dataValues = categories.map(cat =>
      products.filter(p => p.category === cat).reduce((sum, p) => sum + (p.price * p.stock), 0)
    );

    this.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [
          {
            data: dataValues,
            backgroundColor: ['#e11d48', '#f43f5e', '#fb7185', '#9f1239', '#334155'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { family: 'inherit', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${Number(context.raw).toFixed(2)} €`
            }
          }
        }
      }
    });
  }

  public exportPdfReport(): void {
    this.exportService.exportProductsToPdf(this.allProducts(), 'Cuadro de Mando Ejecutivo y Stock');
  }

  public exportCsvReport(): void {
    this.exportService.exportProductsToCsv(this.allProducts(), 'Dashboard_Metricas_NovaGest');
  }
}
