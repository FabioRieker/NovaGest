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
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { RealtimeFirestoreService } from '../../core/services/nosql-realtime.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuditLogDocument, AuditSeverity } from '../../core/models/audit-log.model';

/**
 * Vista de Auditoría y Trazabilidad en Tiempo Real (FASE 3 - Paso 3.1 & RA 5).
 * Demuestra la suscripción a una fuente NoSQL basada en documentos en tiempo real
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
  private realtimeService = inject(RealtimeFirestoreService);
  private notificationService = inject(NotificationService);

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
      shieldCheckmarkOutline
    });
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
    this.notificationService.showToast('Evento emitido al stream NoSQL en tiempo real.', 'success');
  }

  public clearAudit(): void {
    this.realtimeService.clearLogs();
    this.notificationService.showToast('Historial NoSQL reiniciado.', 'primary');
  }
}
