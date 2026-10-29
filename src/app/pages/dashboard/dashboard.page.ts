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
  notificationsOffOutline,
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
  layersOutline,
  pieChartOutline,
  optionsOutline,
  closeOutline,
  checkmarkOutline,
  checkmarkDoneOutline,
  arrowUpOutline,
  arrowDownOutline,
  expandOutline,
  contractOutline,
  moveOutline,
  eyeOutline,
  eyeOffOutline,
  trashOutline,
  addOutline,
  speedometerOutline,
  pulseOutline,
  openOutline,
  createOutline,
  appsOutline,
  gridOutline,
  checkmarkCircleOutline,
  colorWandOutline,
  closeCircleOutline,
  cartOutline,
  hardwareChipOutline
} from 'ionicons/icons';
import { forkJoin, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  DoughnutController,
  ArcElement,
  Legend,
  Tooltip
} from 'chart.js';
import { SqlRestService } from '../../core/services/sql-rest.service';
import { SupabaseRealtimeService } from '../../core/services/supabase-realtime.service';
import { ExportService } from '../../core/services/export.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Router } from '@angular/router';
import { Product } from '../../core/models/product.model';
import { AuditLogDocument } from '../../core/models/audit-log.model';

// Registrar componentes de Chart.js optimizados (Tree-shaking para máximo rendimiento)
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  DoughnutController,
  ArcElement,
  Legend,
  Tooltip
);

const LAYOUT_STORAGE_KEY = 'novagest_dashboard_layout_v2';

export interface DashboardWidget {
  id: string;
  title: string;
  icon: string;
  category: string;
  description?: string;
  visible: boolean;
  width: 'col-12' | 'col-8' | 'col-6' | 'col-4';
  order: number;
}

export interface CatalogWidgetDefinition {
  id: string;
  title: string;
  icon: string;
  category: string;
  description: string;
  defaultWidth: 'col-12' | 'col-8' | 'col-6' | 'col-4';
}

export interface DashboardTemplate {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  description: string;
  widgets: Array<{
    id: string;
    width: 'col-12' | 'col-8' | 'col-6' | 'col-4';
    order: number;
  }>;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  read: boolean;
}

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
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class DashboardPage implements OnInit, OnDestroy {
  @ViewChild('timelineWaveChartCanvas') timelineWaveChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryDoughnutChartCanvas') categoryDoughnutChartCanvas?: ElementRef<HTMLCanvasElement>;
  private themeObserver?: MutationObserver;

  private sqlService = inject(SqlRestService);
  private realtimeService = inject(SupabaseRealtimeService);
  private exportService = inject(ExportService);
  public authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  public isLoading = signal(true);
  public filterPeriod = signal<'7d' | '30d' | 'year'>('30d');
  public searchQuery = signal('');

  // Control de panel de notificaciones
  public isNotificationsOpen = signal(false);

  // Control de personalizador de widgets
  public isCustomizerOpen = signal(false);

  // Notificaciones interactivas del sistema
  public notifications = signal<SystemNotification[]>([
    {
      id: 'notif-1',
      title: 'Alerta de Stock Crítico',
      message: '3 referencias de hardware están por debajo de 5 unidades.',
      time: 'Hace 5 min',
      severity: 'critical',
      read: false
    },
    {
      id: 'notif-2',
      title: 'Aprovisionamiento de Cuenta',
      message: 'Se ha registrado un nuevo usuario operativo con permisos estándar.',
      time: 'Hace 22 min',
      severity: 'info',
      read: false
    },
    {
      id: 'notif-3',
      title: 'Auditoría Supabase Realtime',
      message: 'Sincronización en tiempo real con Supabase completada con 0 anomalías.',
      time: 'Hace 1 hora',
      severity: 'success',
      read: false
    }
  ]);

  public unreadNotificationsCount = computed(() =>
    this.notifications().filter(n => !n.read).length
  );

  // Catálogo completo de widgets disponibles en NovaGest
  public readonly catalogWidgets: CatalogWidgetDefinition[] = [
    {
      id: 'ring_gauges',
      title: 'Medidores Radiales SLA',
      icon: 'speedometer-outline',
      category: 'Métricas',
      description: 'Indicadores en tiempo real de disponibilidad de stock, rotación y SLA de cumplimiento.',
      defaultWidth: 'col-12'
    },
    {
      id: 'kpis',
      title: 'Métricas Principales KPI',
      icon: 'cash-outline',
      category: 'Finanzas',
      description: 'Tarjetas con valor económico del inventario, referencias, stock bajo y roturas.',
      defaultWidth: 'col-12'
    },
    {
      id: 'timeline_wave',
      title: 'Evolución Financiera (TIME LINE)',
      icon: 'stats-chart-outline',
      category: 'Analítica',
      description: 'Curvas de ingresos continuos, costes operativos y previsiones por periodo (7D, 30D, Año).',
      defaultWidth: 'col-8'
    },
    {
      id: 'category_doughnut',
      title: 'Distribución de Activos (Circular)',
      icon: 'pie-chart-outline',
      category: 'Inventario',
      description: 'Gráfica de anillo interactiva con la distribución de capital por familia de producto.',
      defaultWidth: 'col-4'
    },
    {
      id: 'mini_calendar',
      title: 'Calendario & Citas de Auditoría',
      icon: 'calendar-outline',
      category: 'Operativo',
      description: 'Navegador mensual interactivo con fechas clave de inspección y eventos de auditoría.',
      defaultWidth: 'col-4'
    },
    {
      id: 'live_activities',
      title: 'Actividades en Vivo (Supabase Realtime)',
      icon: 'pulse-outline',
      category: 'Auditoría',
      description: 'Feed reactivo conectado a Supabase Realtime con trazabilidad en vivo de modificaciones.',
      defaultWidth: 'col-4'
    },
    {
      id: 'operations',
      title: 'Capacidad Operativa de Almacenes',
      icon: 'layers-outline',
      category: 'Logística',
      description: 'Barras de progreso de ocupación de centros de distribución y despachos 24h.',
      defaultWidth: 'col-4'
    },
    {
      id: 'quick_actions',
      title: 'Acciones Rápidas & Atajos',
      icon: 'flash-outline',
      category: 'Gestión',
      description: 'Accesos directos rápidos para dar de alta productos, exportar informes y revisar auditorías.',
      defaultWidth: 'col-6'
    },
    {
      id: 'critical_stock_table',
      title: 'Alerta de Stock Crítico',
      icon: 'alert-circle-outline',
      category: 'Urgente',
      description: 'Tabla prioritaria de artículos con stock agotado o inferior al umbral de seguridad.',
      defaultWidth: 'col-6'
    },
    {
      id: 'smart_reorder',
      title: 'Sugerencias de Reabastecimiento',
      icon: 'cart-outline',
      category: 'Compras',
      description: 'Cálculo de reposición de artículos con stock por debajo del umbral mínimo y costes de pedido.',
      defaultWidth: 'col-6'
    },
    {
      id: 'security_telemetry',
      title: 'Telemetría & Conectividad Supabase',
      icon: 'shield-checkmark-outline',
      category: 'Seguridad',
      description: 'Estado de conexión en tiempo real, latencia de red, canales WebSocket y verificación RLS.',
      defaultWidth: 'col-6'
    }
  ];

  // Definición inicial de widgets con estado por defecto
  private defaultWidgets: DashboardWidget[] = [
    { id: 'ring_gauges', title: 'Medidores Radiales SLA', icon: 'speedometer-outline', category: 'Métricas', visible: true, width: 'col-12', order: 1 },
    { id: 'kpis', title: 'Métricas Principales KPI', icon: 'cash-outline', category: 'Finanzas', visible: true, width: 'col-12', order: 2 },
    { id: 'timeline_wave', title: 'Evolución Financiera (TIME LINE)', icon: 'stats-chart-outline', category: 'Analítica', visible: true, width: 'col-8', order: 3 },
    { id: 'category_doughnut', title: 'Distribución de Activos (Circular)', icon: 'pie-chart-outline', category: 'Inventario', visible: true, width: 'col-4', order: 4 },
    { id: 'mini_calendar', title: 'Calendario & Citas de Auditoría', icon: 'calendar-outline', category: 'Operativo', visible: true, width: 'col-4', order: 5 },
    { id: 'live_activities', title: 'Actividades en Vivo (Supabase Realtime)', icon: 'pulse-outline', category: 'Auditoría', visible: true, width: 'col-4', order: 6 },
    { id: 'operations', title: 'Capacidad Operativa de Almacenes', icon: 'layers-outline', category: 'Logística', visible: true, width: 'col-4', order: 7 },
    { id: 'quick_actions', title: 'Acciones Rápidas & Atajos', icon: 'flash-outline', category: 'Gestión', visible: false, width: 'col-6', order: 8 },
    { id: 'critical_stock_table', title: 'Alerta de Stock Crítico', icon: 'alert-circle-outline', category: 'Urgente', visible: false, width: 'col-6', order: 9 },
    { id: 'smart_reorder', title: 'Sugerencias de Reabastecimiento', icon: 'cart-outline', category: 'Compras', visible: false, width: 'col-6', order: 10 },
    { id: 'security_telemetry', title: 'Telemetría & Conectividad Supabase', icon: 'shield-checkmark-outline', category: 'Seguridad', visible: false, width: 'col-6', order: 11 }
  ];

  // Control de Modo Edición vs Modo Vista limpio
  public isEditMode = signal(false);

  // Control de bandeja / drawer lateral de widgets
  public isCatalogDrawerOpen = signal(false);

  // Identificador de plantilla activa
  public activeTemplateId = signal<string>('executive');

  // Filtros internos de la bandeja de widgets
  public catalogSearch = signal<string>('');
  public catalogFilterCategory = signal<string>('all');

  // Widget sobre el que se hace hover en drag & drop para drop target visual
  public dragOverWidgetId = signal<string | null>(null);

  // Plantillas predefinidas del cuadro de mando (Presets ejecutivos)
  public readonly templates: DashboardTemplate[] = [
    {
      id: 'executive',
      name: 'Ejecutivo 360°',
      icon: 'sparkles-outline',
      badge: 'Recomendado',
      description: 'Visión integral: SLAs en tiempo real, KPIs económicos, timeline y actividad reciente.',
      widgets: [
        { id: 'ring_gauges', width: 'col-12', order: 1 },
        { id: 'kpis', width: 'col-12', order: 2 },
        { id: 'timeline_wave', width: 'col-8', order: 3 },
        { id: 'category_doughnut', width: 'col-4', order: 4 },
        { id: 'mini_calendar', width: 'col-4', order: 5 },
        { id: 'live_activities', width: 'col-4', order: 6 },
        { id: 'operations', width: 'col-4', order: 7 }
      ]
    },
    {
      id: 'financial',
      name: 'Analítica Financiera',
      icon: 'stats-chart-outline',
      badge: 'Finanzas',
      description: 'Enfocado en facturación, evolución de ingresos y costes, y balance por familias de artículos.',
      widgets: [
        { id: 'timeline_wave', width: 'col-12', order: 1 },
        { id: 'kpis', width: 'col-12', order: 2 },
        { id: 'category_doughnut', width: 'col-6', order: 3 },
        { id: 'operations', width: 'col-6', order: 4 },
        { id: 'ring_gauges', width: 'col-12', order: 5 }
      ]
    },
    {
      id: 'operations',
      name: 'Logística & Stock Crítico',
      icon: 'layers-outline',
      badge: 'Operativa',
      description: 'Monitorización de roturas de stock, capacidad de almacenes y acciones urgentes.',
      widgets: [
        { id: 'ring_gauges', width: 'col-12', order: 1 },
        { id: 'critical_stock_table', width: 'col-6', order: 2 },
        { id: 'operations', width: 'col-6', order: 3 },
        { id: 'live_activities', width: 'col-6', order: 4 },
        { id: 'quick_actions', width: 'col-6', order: 5 },
        { id: 'mini_calendar', width: 'col-12', order: 6 }
      ]
    },
    {
      id: 'minimal',
      name: 'Resumen Ejecutivo Compacto',
      icon: 'grid-outline',
      badge: 'Minimal',
      description: 'Vista condensada y sin distracciones con los indicadores vitales de la compañía.',
      widgets: [
        { id: 'kpis', width: 'col-12', order: 1 },
        { id: 'timeline_wave', width: 'col-8', order: 2 },
        { id: 'category_doughnut', width: 'col-4', order: 3 },
        { id: 'ring_gauges', width: 'col-12', order: 4 }
      ]
    }
  ];

  // Control de pestaña en el personalizador secundario: activos vs catálogo
  public customizerTab = signal<'active' | 'catalog'>('active');

  public widgets = signal<DashboardWidget[]>(this.loadWidgetsLayout());

  public orderedWidgets = computed(() => {
    return [...this.widgets()].sort((a, b) => a.order - b.order);
  });

  public activeWidgets = computed(() => {
    return this.orderedWidgets().filter(w => w.visible);
  });

  public availableWidgetsToAdd = computed(() => {
    return this.widgets().filter(w => !w.visible);
  });

  public filteredCatalogWidgets = computed(() => {
    const q = this.catalogSearch().toLowerCase().trim();
    const cat = this.catalogFilterCategory();

    return this.catalogWidgets.filter(w => {
      const matchQuery = !q ||
        w.title.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q);
      const matchCat = cat === 'all' || w.category.toLowerCase() === cat.toLowerCase();
      return matchQuery && matchCat;
    });
  });

  public catalogCategories = computed(() => {
    const cats = new Set(this.catalogWidgets.map(w => w.category));
    return ['all', ...Array.from(cats)];
  });

  public hasSearchQuery = computed(() => !!this.searchQuery().trim());

  public searchMatchCount = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.activeWidgets().length;
    return this.activeWidgets().filter(w => this.isWidgetSearchMatch(w)).length;
  });

  // Datos consolidados
  public totalProducts = signal(0);
  public totalInventoryValue = signal(0);
  public lowStockCount = signal(0);
  public outOfStockCount = signal(0);
  public allProducts = signal<Product[]>([]);
  public recentLogs = signal<AuditLogDocument[]>([]);

  // Calendario
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
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: CalendarDay[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null });
    }

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

  // Gauges
  public ringGauges = [
    { label: 'Disponibilidad Stock', value: '94%', percent: 94, color: '#38bdf8', icon: 'cube-outline', subtitle: 'Catálogo operativo' },
    { label: 'Rotación Inventario', value: '82%', percent: 82, color: '#ff2a6d', icon: 'repeat-outline', subtitle: 'Alta rotación' },
    { label: 'Eficiencia Almacén', value: '76%', percent: 76, color: '#a855f7', icon: 'flash-outline', subtitle: 'Rendimiento SLA' },
    { label: 'SLA Cumplimiento', value: '98%', percent: 98, color: '#f59e0b', icon: 'shield-checkmark-outline', subtitle: 'Despacho puntual' }
  ];

  // Sliders operacionales
  public operationalMeters = [
    { name: 'Almacén Central (Madrid)', progress: 78, color: '#ff2a6d', detail: '3.420 / 4.400 pallets' },
    { name: 'Hub Logístico (Barcelona)', progress: 64, color: '#38bdf8', detail: '1.920 / 3.000 pallets' },
    { name: 'Plataforma Norte (Bilbao)', progress: 88, color: '#a855f7', detail: '880 / 1.000 pallets' },
    { name: 'Tasa de Despacho 24h', progress: 92, color: '#10b981', detail: '92% entrega inmediata' }
  ];

  // Lista de productos críticos (stock <= 5 o agotados) para widget de alertas prioritarias
  public criticalProducts = computed(() => {
    return this.allProducts().filter(p => p.stock <= 5).slice(0, 6);
  });

  // Telemetría y conectividad
  public isPingingTelemetry = signal(false);
  public telemetryLatency = signal(18);

  // Coste estimado de reposición sugerida
  public estimatedReorderCost = computed(() => {
    const total = this.criticalProducts().reduce((sum, p) => {
      const needed = Math.max(0, 20 - p.stock);
      return sum + (needed * p.price * 0.7);
    }, 0);
    return total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });

  public pingTelemetry(): void {
    this.isPingingTelemetry.set(true);
    const start = performance.now();
    this.sqlService.getProducts().pipe(take(1)).subscribe({
      next: () => {
        const elapsed = Math.round(performance.now() - start);
        this.telemetryLatency.set(Math.max(12, elapsed));
        this.isPingingTelemetry.set(false);
        this.notificationService.showToast(`Ping a Supabase completado: ${this.telemetryLatency()}ms`, 'success');
      },
      error: () => {
        this.isPingingTelemetry.set(false);
        this.notificationService.showToast('Error al comprobar latencia.', 'danger');
      }
    });
  }

  public createReorderPO(product: Product): void {
    const suggestedUnits = Math.max(5, 20 - product.stock);
    const estCost = (suggestedUnits * product.price * 0.7).toFixed(2);
    this.realtimeService.logActivity(
      'ALERT',
      'PRODUCT',
      `Orden de reposición sugerida para ${product.name} (+${suggestedUnits} uds. - ${estCost} €)`,
      'info'
    );
    this.notificationService.showToast(
      `Orden de compra generada para ${product.name} (+${suggestedUnits} uds.)`,
      'success'
    );
  }

  private timelineChart: Chart | null = null;
  private doughnutChart: Chart | null = null;
  private subscriptions = new Subscription();
  private draggedWidgetId: string | null = null;

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
      notificationsOffOutline,
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
      layersOutline,
      pieChartOutline,
      optionsOutline,
      closeOutline,
      checkmarkOutline,
      checkmarkDoneOutline,
      arrowUpOutline,
      arrowDownOutline,
      expandOutline,
      contractOutline,
      moveOutline,
      eyeOutline,
      eyeOffOutline,
      trashOutline,
      addOutline,
      speedometerOutline,
      pulseOutline,
      openOutline,
      createOutline,
      appsOutline,
      gridOutline,
      checkmarkCircleOutline,
      colorWandOutline,
      closeCircleOutline,
      cartOutline,
      hardwareChipOutline
    });
  }

  ngOnInit(): void {
    this.loadConsolidatedData();
    this.setupThemeObserver();

    this.subscriptions.add(
      this.realtimeService.documents$.subscribe(docs => {
        this.recentLogs.set(docs.slice(0, 6));
      })
    );
  }

  private setupThemeObserver(): void {
    if (typeof window !== 'undefined' && 'MutationObserver' in window) {
      this.themeObserver = new MutationObserver(() => {
        setTimeout(() => this.renderCharts(), 50);
      });
      this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }

  ngOnDestroy(): void {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
    this.destroyCharts();
    this.subscriptions.unsubscribe();
  }

  private destroyCharts(): void {
    if (this.timelineChart) {
      this.timelineChart.destroy();
      this.timelineChart = null;
    }
    if (this.doughnutChart) {
      this.doughnutChart.destroy();
      this.doughnutChart = null;
    }
  }

  private loadWidgetsLayout(): DashboardWidget[] {
    try {
      const data = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (data) {
        const parsed: DashboardWidget[] = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Fusionar con catálogo para garantizar que widgets nuevos estén disponibles
          const merged: DashboardWidget[] = [...parsed];
          for (const def of this.defaultWidgets) {
            if (!merged.some(w => w.id === def.id)) {
              merged.push({ ...def, visible: false, order: merged.length + 1 });
            }
          }
          return merged;
        }
      }
    } catch (e) {
      console.warn('Error leyendo layout de widgets guardado', e);
    }
    return JSON.parse(JSON.stringify(this.defaultWidgets));
  }

  private saveWidgetsLayout(widgets: DashboardWidget[]): void {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(widgets));
    this.widgets.set(widgets);
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
          }, 120);
        },
        error: (err) => {
          console.error('Error cargando datos:', err);
          this.isLoading.set(false);
        }
      })
    );
  }

  // GESTIÓN DE NOTIFICACIONES
  public toggleNotifications(): void {
    this.isNotificationsOpen.update(v => !v);
  }

  public markNotificationAsRead(id: string): void {
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  public markAllNotificationsAsRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.notificationService.showToast('Todas las alertas marcadas como leídas.', 'success');
  }

  public clearNotifications(): void {
    this.notifications.set([]);
    this.notificationService.showToast('Bandeja de alertas limpiada.', 'primary');
  }

  // GESTIÓN DE MODO EDICIÓN, PLANTILLAS Y BANDEJA DE WIDGETS
  public toggleEditMode(): void {
    this.isEditMode.update(v => {
      const next = !v;
      if (next) {
        this.notificationService.showToast('Modo Edición activo. Arrastra las tarjetas o ajusta tamaños.', 'primary');
      } else {
        this.notificationService.showToast('Diseño del cuadro de mando guardado.', 'success');
      }
      return next;
    });
  }

  public toggleCatalogDrawer(): void {
    this.isCatalogDrawerOpen.update(v => !v);
  }

  public closeCatalogDrawer(): void {
    this.isCatalogDrawerOpen.set(false);
  }

  /**
   * Aplica una plantilla predefinida y reorganiza instantáneamente los widgets
   */
  public applyTemplate(templateId: string): void {
    const tpl = this.templates.find(t => t.id === templateId);
    if (!tpl) return;

    this.activeTemplateId.set(templateId);

    const updated = this.widgets().map(w => {
      const match = tpl.widgets.find(item => item.id === w.id);
      if (match) {
        return {
          ...w,
          visible: true,
          width: match.width,
          order: match.order
        };
      } else {
        return {
          ...w,
          visible: false
        };
      }
    });

    this.saveWidgetsLayout(updated);
    this.notificationService.showToast(`Plantilla "${tpl.name}" aplicada correctamente.`, 'success');
    setTimeout(() => this.renderCharts(), 120);
  }

  public isWidgetSearchMatch(widget: DashboardWidget): boolean {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return true;
    return widget.title.toLowerCase().includes(q) ||
           widget.category.toLowerCase().includes(q) ||
           (widget.description || '').toLowerCase().includes(q);
  }

  public clearSearch(): void {
    this.searchQuery.set('');
  }

  public toggleCustomizer(): void {
    this.isCustomizerOpen.update(v => !v);
  }

  /**
   * Quita un widget del cuadro de mando activo y lo envía al catálogo de disponibles
   */
  public removeWidget(id: string): void {
    const target = this.widgets().find(w => w.id === id);
    const updated = this.widgets().map(w =>
      w.id === id ? { ...w, visible: false } : w
    );
    this.saveWidgetsLayout(updated);
    this.notificationService.showToast(
      `Módulo "${target?.title || id}" quitado del lienzo.`,
      'primary'
    );
    setTimeout(() => this.renderCharts(), 100);
  }

  /**
   * Añade un widget del catálogo al cuadro de mando activo
   */
  public addWidget(id: string): void {
    const currentActive = this.widgets().filter(w => w.visible);
    const nextOrder = currentActive.length + 1;
    const target = this.widgets().find(w => w.id === id);

    const updated = this.widgets().map(w =>
      w.id === id ? { ...w, visible: true, order: nextOrder } : w
    );
    this.saveWidgetsLayout(updated);
    this.notificationService.showToast(
      `Módulo "${target?.title || id}" añadido al lienzo.`,
      'success'
    );
    setTimeout(() => this.renderCharts(), 120);
  }

  /**
   * Alterna la visibilidad rápida de un widget
   */
  public toggleWidgetVisibility(id: string): void {
    const w = this.widgets().find(item => item.id === id);
    if (w?.visible) {
      this.removeWidget(id);
    } else {
      this.addWidget(id);
    }
  }

  /**
   * Fija la anchura específica de un widget (col-4, col-6, col-8, col-12)
   */
  public setWidgetWidth(id: string, width: 'col-12' | 'col-8' | 'col-6' | 'col-4'): void {
    const updated = this.widgets().map(w =>
      w.id === id ? { ...w, width } : w
    );
    this.saveWidgetsLayout(updated);
    setTimeout(() => this.renderCharts(), 100);
  }

  /**
   * Cicla interactivamente el tamaño del widget al pulsar en la manija inferior derecha
   * (33% -> 50% -> 66% -> 100% -> 33%)
   */
  public cycleWidgetWidth(id: string): void {
    const widths: Array<'col-4' | 'col-6' | 'col-8' | 'col-12'> = ['col-4', 'col-6', 'col-8', 'col-12'];
    const current = this.widgets().find(w => w.id === id);
    if (!current) return;
    const currentIdx = widths.indexOf(current.width);
    const nextWidth = widths[(currentIdx + 1) % widths.length];
    this.setWidgetWidth(id, nextWidth);

    const percentText = nextWidth === 'col-12' ? '100% (12 col)' : nextWidth === 'col-8' ? '66% (8 col)' : nextWidth === 'col-6' ? '50% (6 col)' : '33% (4 col)';
    this.notificationService.showToast(`Tamaño de "${current.title}" ajustado a ${percentText}`, 'primary');
  }

  /**
   * Mueve un widget arriba o abajo dentro de los widgets activos
   */
  public moveWidget(id: string, direction: 'up' | 'down'): void {
    const all = [...this.widgets()];
    const active = all.filter(w => w.visible).sort((a, b) => a.order - b.order);
    const index = active.findIndex(w => w.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const prev = active[index - 1];
      const current = active[index];
      const tempOrder = prev.order;
      prev.order = current.order;
      current.order = tempOrder;
    } else if (direction === 'down' && index < active.length - 1) {
      const next = active[index + 1];
      const current = active[index];
      const tempOrder = next.order;
      next.order = current.order;
      current.order = tempOrder;
    } else {
      return;
    }

    const updated = all.map(w => {
      const match = active.find(a => a.id === w.id);
      return match ? match : w;
    });

    this.saveWidgetsLayout(updated);
  }

  /**
   * Restablece el cuadro de mando a la configuración original de fábrica
   */
  public resetDefaultLayout(): void {
    this.saveWidgetsLayout(JSON.parse(JSON.stringify(this.defaultWidgets)));
    this.activeTemplateId.set('executive');
    this.notificationService.showToast('Diseño del Cuadro de Mando restablecido a la configuración de fábrica.', 'primary');
    setTimeout(() => this.renderCharts(), 120);
  }

  // DRAG & DROP DE WIDGETS
  public onDragStart(event: DragEvent, widgetId: string): void {
    if (!this.isEditMode()) {
      event.preventDefault();
      return;
    }
    this.draggedWidgetId = widgetId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', widgetId);
    }
  }

  public onDragOver(event: DragEvent, targetWidgetId?: string): void {
    if (!this.isEditMode()) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (targetWidgetId && this.draggedWidgetId && this.draggedWidgetId !== targetWidgetId) {
      this.dragOverWidgetId.set(targetWidgetId);
    }
  }

  public onDragLeave(event: DragEvent, targetWidgetId?: string): void {
    if (targetWidgetId && this.dragOverWidgetId() === targetWidgetId) {
      this.dragOverWidgetId.set(null);
    }
  }

  public onDragEnd(): void {
    this.draggedWidgetId = null;
    this.dragOverWidgetId.set(null);
  }

  public onDrop(event: DragEvent, targetWidgetId: string): void {
    event.preventDefault();
    this.dragOverWidgetId.set(null);
    if (!this.draggedWidgetId || this.draggedWidgetId === targetWidgetId) return;

    const all = [...this.widgets()];
    const active = all.filter(w => w.visible).sort((a, b) => a.order - b.order);
    const fromIndex = active.findIndex(w => w.id === this.draggedWidgetId);
    const toIndex = active.findIndex(w => w.id === targetWidgetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const [moved] = active.splice(fromIndex, 1);
      active.splice(toIndex, 0, moved);

      // Reasignar órdenes continuos
      active.forEach((w, idx) => {
        w.order = idx + 1;
      });

      const updated = all.map(w => {
        const match = active.find(a => a.id === w.id);
        return match ? match : w;
      });

      this.saveWidgetsLayout(updated);
      this.notificationService.showToast(`Módulo recolocado en posición #${toIndex + 1}`, 'primary');
    }

    this.draggedWidgetId = null;
  }

  public isWidgetVisible(id: string): boolean {
    const w = this.widgets().find(item => item.id === id);
    return w ? w.visible : false;
  }

  public getWidgetWidthClass(id: string): string {
    const w = this.widgets().find(item => item.id === id);
    return w ? w.width : 'col-6';
  }

  // Navegación auxiliar para widgets interactivos
  public navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  public navigateToProduct(id?: string | number): void {
    if (id) {
      this.router.navigate(['/product-form', id]);
    } else {
      this.router.navigate(['/product-form']);
    }
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

  public renderCharts(): void {
    if (this.isWidgetVisible('timeline_wave')) {
      this.renderTimelineWaveChart();
    }
    if (this.isWidgetVisible('category_doughnut')) {
      this.renderCategoryDoughnutChart();
    }
  }

  /**
   * Gráfico de Ondas Multicapa Fluídas (Spline Wave Area Chart)
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

    const gradSales = ctx.createLinearGradient(0, 0, 0, 320);
    gradSales.addColorStop(0, 'rgba(255, 42, 109, 0.45)');
    gradSales.addColorStop(0.5, 'rgba(225, 29, 72, 0.18)');
    gradSales.addColorStop(1, 'rgba(225, 29, 72, 0.0)');

    const gradCosts = ctx.createLinearGradient(0, 0, 0, 320);
    gradCosts.addColorStop(0, 'rgba(251, 146, 60, 0.4)');
    gradCosts.addColorStop(0.5, 'rgba(249, 115, 22, 0.15)');
    gradCosts.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

    const gradProj = ctx.createLinearGradient(0, 0, 0, 320);
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
        animation: {
          duration: 300
        },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: document.body.classList.contains('dark') ? '#cbd5e1' : '#1e293b',
              font: { family: 'inherit', size: 11, weight: 600 },
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: document.body.classList.contains('dark') ? 'rgba(16, 11, 38, 0.95)' : 'rgba(15, 23, 42, 0.95)',
            titleColor: '#ffffff',
            bodyColor: document.body.classList.contains('dark') ? '#e2e8f0' : '#f8fafc',
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
            grid: { color: document.body.classList.contains('dark') ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)' },
            ticks: { color: document.body.classList.contains('dark') ? '#94a3b8' : '#475569', font: { family: 'inherit', size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: document.body.classList.contains('dark') ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)' },
            ticks: {
              color: document.body.classList.contains('dark') ? '#94a3b8' : '#475569',
              font: { family: 'inherit', size: 11 },
              callback: (val) => `${val} €`
            }
          }
        }
      }
    });
  }

  /**
   * Gráfica Circular de Distribución de Activos (Doughnut Chart)
   * Como solicitó explícitamente el usuario mostrando la captura
   */
  private renderCategoryDoughnutChart(): void {
    if (!this.categoryDoughnutChartCanvas) return;

    if (this.doughnutChart) {
      this.doughnutChart.destroy();
    }

    const ctx = this.categoryDoughnutChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const products = this.allProducts();
    const categories = ['Hardware', 'Electrónica', 'Mobiliario', 'Servicios', 'Papelería'];
    const dataValues = categories.map(cat =>
      products.filter(p => p.category === cat).reduce((sum, p) => sum + (p.price * p.stock), 0)
    );

    // Paleta Ruby Neón & Slate (Idéntica a la captura de pantalla adjunta)
    const sliceColors = [
      '#e11d48', // Hardware (Rojo rubí)
      '#f43f5e', // Electrónica (Crimson)
      '#fb7185', // Mobiliario (Rosa palo)
      '#9f1239', // Servicios (Granate oscuro)
      '#334155'  // Papelería (Pizarra titanio)
    ];

    this.doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [
          {
            data: dataValues,
            backgroundColor: sliceColors,
            borderColor: document.body.classList.contains('dark') ? 'rgba(21, 15, 46, 0.9)' : '#ffffff',
            borderWidth: 3,
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 300
        },
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: document.body.classList.contains('dark') ? '#f8fafc' : '#1e293b',
              font: { family: 'inherit', size: 11, weight: 600 },
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 12
            }
          },
          tooltip: {
            backgroundColor: document.body.classList.contains('dark') ? 'rgba(16, 11, 38, 0.95)' : 'rgba(15, 23, 42, 0.95)',
            titleColor: '#ffffff',
            bodyColor: document.body.classList.contains('dark') ? '#e2e8f0' : '#f8fafc',
            borderColor: 'rgba(255, 42, 109, 0.5)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${Number(ctx.raw).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
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
