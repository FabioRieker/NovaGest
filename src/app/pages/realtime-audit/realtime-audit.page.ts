import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonBadge,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  trashOutline,
  pulseOutline,
  radioOutline,
  addCircleOutline,
  shieldCheckmarkOutline,
  logOutOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseRealtimeService } from '../../core/services/supabase-realtime.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuditLogDocument, AuditSeverity } from '../../core/models/audit-log.model';

/**
 * Vista de Auditoría y Trazabilidad en Tiempo Real con Supabase Realtime (FASE 3 - Paso 3.1 & RA 5).
 * Demuestra la suscripción a canales WebSocket de Supabase en tiempo real
 * con actualización reactiva en vivo y gestión de memoria (OnDestroy).
 */
@Component({
  selector: 'app-realtime-audit',
  templateUrl: './realtime-audit.page.html',
  styleUrls: ['./realtime-audit.page.scss'],
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
    IonBadge,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption
  ]
})
export class RealtimeAuditPage implements OnInit, OnDestroy {
  private realtimeService = inject(SupabaseRealtimeService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);

  public allLogs = signal<AuditLogDocument[]>([]);
  public filteredLogs = signal<AuditLogDocument[]>([]);
  public severityFilter = signal<string>('ALL');

  private subscription: Subscription | null = null;

  constructor() {
    addIcons({
      timeOutline,
      trashOutline,
      pulseOutline,
      radioOutline,
      addCircleOutline,
      shieldCheckmarkOutline,
      logOutOutline
    });
  }

  public logout(): void {
    this.authService.logout();
    this.notificationService.showToast('Sesión cerrada correctamente.', 'primary');
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    this.subscription = this.realtimeService.documents$.subscribe(docs => {
      this.allLogs.set(docs);
      this.applyFilter();
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public onFilterChange(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    const filter = this.severityFilter();
    if (filter === 'ALL') {
      this.filteredLogs.set(this.allLogs());
    } else {
      this.filteredLogs.set(this.allLogs().filter(l => l.severity === filter));
    }
  }

  public simulatePing(): void {
    this.realtimeService.logActivity(
      'ALERT',
      'SYSTEM',
      'Prueba de telemetría y sincronización manual disparada por el usuario',
      'info'
    );
    this.notificationService.showToast('Evento emitido a Supabase Realtime con éxito.', 'success');
  }

  public clearAudit(): void {
    this.realtimeService.clearLogs();
    this.notificationService.showToast('Historial de auditoría reiniciado.', 'primary');
  }
}
