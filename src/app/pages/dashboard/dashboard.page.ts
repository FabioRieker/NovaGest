import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
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
  IonButton,
  IonIcon,
  IonSpinner
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
  logOutOutline,
  searchOutline,
  notificationsOutline,
  settingsOutline,
  mailOutline,
  personCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  repeatOutline,
  flashOutline,
  shieldCheckmarkOutline,
  filterOutline,
  trendingUpOutline,
  trendingDownOutline,
  removeOutline,
  calendarOutline,
  layersOutline
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
import { Product } from '../../core/models/product.model';
import { AuditLogDocument } from '../../core/models/audit-log.model';

// Registrar componentes de Chart.js
Chart.register(...registerables);

interface CalendarDay {
  day: number | null;
  hasEvent?: boolean;
  isToday?: boolean;
}

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
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class DashboardPage implements OnInit, OnDestroy {
  @ViewChild('timelineWaveChartCanvas') timelineWaveChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryEqualizerChartCanvas') categoryEqualizerChartCanvas!: ElementRef<HTMLCanvasElement>;

  private sqlService = inject(SqlRestService);
  private realtimeService = inject(RealtimeFirestoreService);
  private exportService = inject(ExportService);
  public authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  public isLoading = signal(true);
  public filterPeriod = signal<'7d' | '30d' | 'year'>('30d');
  public searchQuery = signal('');

  // Métricas de inventario y catálogo
  public totalProducts = signal(0);
  public totalInventoryValue = signal(0);
  public lowStockCount = signal(0);
  public outOfStockCount = signal(0);
  public allProducts = signal<Product[]>([]);
  public recentLogs = signal<AuditLogDocument[]>([]);

  // Calendario interactivo
  public calendarMonth = signal(new Date(2026, 9, 1)); // Octubre 2026
  public selectedCalendarDay = signal(26);

  public calendarMonthTitle = computed(() => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const m = this.calendarMonth();
    return `${months[m.getMonth()]} ${m.getFullYear()}`;
  });

  public calendarDays = computed<CalendarDay[]>(() => {
    const d = this.calendarMonth();
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Lunes = 0
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: CalendarDay[] = [];

    // Celdas vacías al inicio
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null });
    }

    // Días del mes con marcadores de eventos
    const eventDays = [3, 8, 14, 19, 24, 26, 29];
    for (let day = 1; day <= totalDays; day++) {
      days.push({
        day,
        hasEvent: eventDays.includes(day),
        isToday: day === 26 && month === 9 && year === 2026
      });
    }

    return days;
  });

  // Indicadores de medidores radiales (Gauges circulares inspirados en la maqueta)
  public ringGauges = [
    { label: 'Disponibilidad Stock', value: '94%', percent: 94, color: '#38bdf8', icon: 'cube-outline', subtitle: 'Catálogo operativo' },
    { label: 'Rotación Inventario', value: '82%', percent: 82, color: '#ff2a6d', icon: 'repeat-outline', subtitle: 'Alta rotación' },
    { label: 'Eficiencia Almacén', value: '76%', percent: 76, color: '#a855f7', icon: 'flash-outline', subtitle: 'Rendimiento SLA' },
    { label: 'SLA Cumplimiento', value: '98%', percent: 98, color: '#f59e0b', icon: 'shield-checkmark-outline', subtitle: 'Despacho puntual' }
  ];

  // Sliders operacionales de almacenes
  public operationalMeters = [
    { name: 'Almacén Central (Madrid)', progress: 78, color: '#ff2a6d', detail: '3.420 / 4.400 pallets' },
    { name: 'Hub Logístico (Barcelona)', progress: 64, color: '#38bdf8', detail: '1.920 / 3.000 pallets' },
    { name: 'Plataforma Norte (Bilbao)', progress: 88, color: '#a855f7', detail: '880 / 1.000 pallets' },
    { name: 'Tasa de Despacho 24h', progress: 92, color: '#10b981', detail: '92% entrega inmediata' }
  ];

  // Instancias de Chart.js
  private timelineChart: Chart | null = null;
  private equalizerChart: Chart | null = null;
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
      logOutOutline,
      searchOutline,
      notificationsOutline,
      settingsOutline,
      mailOutline,
      personCircleOutline,
      chevronBackOutline,
      chevronForwardOutline,
      repeatOutline,
      flashOutline,
      shieldCheckmarkOutline,
      filterOutline,
      trendingUpOutline,
      trendingDownOutline,
      removeOutline,
      calendarOutline,
      layersOutline
    });
  }

  ngOnInit(): void {
    this.loadConsolidatedData();

    // Suscripción al stream NoSQL en tiempo real para eventos de auditoría
    this.subscriptions.add(
      this.realtimeService.documents$.subscribe(docs => {
        this.recentLogs.set(docs.slice(0, 6));
      })
    );
  }

  ngOnDestroy(): void {
    if (this.timelineChart) {
      this.timelineChart.destroy();
      this.timelineChart = null;
    }
    if (this.equalizerChart) {
      this.equalizerChart.destroy();
      this.equalizerChart = null;
    }
    this.subscriptions.unsubscribe();
  }

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

          setTimeout(() => {
            this.renderCharts();
          }, 100);
        },
        error: (err) => {
          console.error('Error cargando datos:', err);
          this.isLoading.set(false);
        }
      })
    );
  }

  public setPeriod(period: '7d' | '30d' | 'year'): void {
    this.filterPeriod.set(period);
    this.renderTimelineWaveChart();
  }

  public prevMonth(): void {
    const cur = this.calendarMonth();
    this.calendarMonth.set(new Date(cur.getFullYear(), cur.getMonth() - 1, 1));
  }

  public nextMonth(): void {
    const cur = this.calendarMonth();
    this.calendarMonth.set(new Date(cur.getFullYear(), cur.getMonth() + 1, 1));
  }

  public selectDay(day: number | null): void {
    if (day !== null) {
      this.selectedCalendarDay.set(day);
      this.notificationService.showToast(`Filtrando auditoría para el día ${day} de ${this.calendarMonthTitle()}`, 'primary');
    }
  }

  private renderCharts(): void {
    this.renderTimelineWaveChart();
    this.renderCategoryEqualizerChart();
  }

  /**
   * Renderiza el gráfico de ondas multicapa (Spline Multi-Wave Area Chart)
   * Inspirado directamente en las curvas fluidas de las maquetas adjuntas
   */
  private renderTimelineWaveChart(): void {
    if (!this.timelineWaveChartCanvas) return;

    if (this.timelineChart) {
      this.timelineChart.destroy();
    }

    const ctx = this.timelineWaveChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const period = this.filterPeriod();

    let labels: string[];
    let salesData: number[];
    let costsData: number[];
    let projectionData: number[];

    if (period === '7d') {
      labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      salesData = [3200, 4800, 3900, 5600, 6800, 4200, 5100];
      costsData = [1600, 2100, 1800, 2400, 2800, 1900, 2200];
      projectionData = [2800, 3900, 3400, 4900, 5700, 3800, 4500];
    } else if (period === 'year') {
      labels = ['2021', '2022', '2023', '2024', '2025', '2026 (Act.)'];
      salesData = [120000, 165000, 210000, 280000, 340000, 420000];
      costsData = [75000, 98000, 115000, 145000, 180000, 210000];
      projectionData = [100000, 140000, 185000, 240000, 310000, 390000];
    } else {
      labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'];
      salesData = [18500, 22800, 19400, 27500, 31200, 28900, 34100, 38200, 36500, 43200];
      costsData = [9800, 11500, 10200, 13400, 14800, 13900, 15600, 17200, 16800, 19100];
      projectionData = [15000, 19000, 17200, 23000, 27500, 25000, 30000, 34500, 33000, 39000];
    }

    // Gradiente 1: Neon Crimson / Hot Pink
    const gradSales = ctx.createLinearGradient(0, 0, 0, 300);
    gradSales.addColorStop(0, 'rgba(255, 42, 109, 0.45)');
    gradSales.addColorStop(0.5, 'rgba(225, 29, 72, 0.2)');
    gradSales.addColorStop(1, 'rgba(225, 29, 72, 0.0)');

    // Gradiente 2: Electric Orange / Amber
    const gradCosts = ctx.createLinearGradient(0, 0, 0, 300);
    gradCosts.addColorStop(0, 'rgba(251, 146, 60, 0.4)');
    gradCosts.addColorStop(0.5, 'rgba(249, 115, 22, 0.15)');
    gradCosts.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

    // Gradiente 3: Neon Violet / Cyan
    const gradProj = ctx.createLinearGradient(0, 0, 0, 300);
    gradProj.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
    gradProj.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
    gradProj.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    this.timelineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos Netos (€)',
            data: salesData,
            borderColor: '#ff2a6d',
            backgroundColor: gradSales,
            fill: true,
            tension: 0.42,
            borderWidth: 3,
            pointBackgroundColor: '#ff2a6d',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7
          },
          {
            label: 'Costes Operativos (€)',
            data: costsData,
            borderColor: '#fb923c',
            backgroundColor: gradCosts,
            fill: true,
            tension: 0.42,
            borderWidth: 2.5,
            pointBackgroundColor: '#fb923c',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            label: 'Previsión de Flujo (€)',
            data: projectionData,
            borderColor: '#a855f7',
            backgroundColor: gradProj,
            fill: true,
            tension: 0.42,
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: 'inherit', size: 11, weight: 600 },
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: 'rgba(16, 11, 38, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255, 42, 109, 0.4)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString('es-ES')} €`
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#94a3b8',
              font: { family: 'inherit', size: 11 }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#94a3b8',
              font: { family: 'inherit', size: 11 },
              callback: (val) => `${val} €`
            }
          }
        }
      }
    });
  }

  /**
   * Renderiza el gráfico de ecualizador / barras por categoría
   */
  private renderCategoryEqualizerChart(): void {
    if (!this.categoryEqualizerChartCanvas) return;

    if (this.equalizerChart) {
      this.equalizerChart.destroy();
    }

    const ctx = this.categoryEqualizerChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const products = this.allProducts();
    const categories = ['Hardware', 'Electrónica', 'Mobiliario', 'Servicios', 'Papelería'];
    const dataValues = categories.map(cat =>
      products.filter(p => p.category === cat).reduce((sum, p) => sum + (p.price * p.stock), 0)
    );

    // Gradientes por barra (Cyan, Lime, Orange, Hot Pink, Violet)
    const colors = [
      '#00f0ff',
      '#10b981',
      '#f97316',
      '#ff2a6d',
      '#a855f7'
    ];

    this.equalizerChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [
          {
            label: 'Valoración en Almacén (€)',
            data: dataValues,
            backgroundColor: colors,
            borderRadius: 8,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(16, 11, 38, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(0, 240, 255, 0.4)',
            borderWidth: 1,
            callbacks: {
              label: (context) => ` Valoración: ${Number(context.raw).toFixed(2)} €`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#cbd5e1',
              font: { family: 'inherit', size: 11, weight: 600 }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'inherit', size: 10 },
              callback: (val) => `${val} €`
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

  public logout(): void {
    this.authService.logout();
    this.notificationService.showToast('Sesión cerrada correctamente.', 'primary');
    this.router.navigate(['/login']);
  }
}
