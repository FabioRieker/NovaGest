import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuditLogDocument, AuditAction, AuditEntity, AuditSeverity } from '../models/audit-log.model';
import { AuthService } from './auth.service';

const NOSQL_STORAGE_KEY = 'novagest_nosql_audit';

/**
 * Servicio que simula una Base de Datos NoSQL basada en Documentos con sincronización en tiempo real (tipo Firestore).
 * Expone un flujo reactivo (BehaviorSubject/Observable) con soporte de suscripción en vivo
 * y simulación de eventos en segundo plano (heartbeat/webhooks).
 */
@Injectable({
  providedIn: 'root'
})
export class RealtimeFirestoreService implements OnDestroy {
  private authService = inject(AuthService);

  private readonly initialDocs: AuditLogDocument[] = [
    {
      id: 'doc-log-001',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      action: 'LOGIN',
      entity: 'AUTH',
      details: 'Inicio de sesión exitoso con rol Administrador desde 192.168.1.45',
      userId: 'usr-admin-001',
      userEmail: 'admin@empresa.com',
      severity: 'info'
    },
    {
      id: 'doc-log-002',
      timestamp: new Date(Date.now() - 2800000).toISOString(),
      action: 'CREATE',
      entity: 'PRODUCT',
      entityId: 'prod-001',
      details: 'Registro de alta para servidor Dell PowerEdge R750',
      userId: 'usr-admin-001',
      userEmail: 'admin@empresa.com',
      severity: 'success'
    },
    {
      id: 'doc-log-003',
      timestamp: new Date(Date.now() - 1500000).toISOString(),
      action: 'ALERT',
      entity: 'PRODUCT',
      entityId: 'prod-006',
      details: 'Alerta automática: Stock agotado para Monitor Curvo LG UltraWide',
      userId: 'system-agent',
      userEmail: 'system@novagest.local',
      severity: 'critical'
    },
    {
      id: 'doc-log-004',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      action: 'ALERT',
      entity: 'PRODUCT',
      entityId: 'prod-004',
      details: 'Alerta de aprovisionamiento: Stock bajo para Silla Ergonómica Herman Miller',
      userId: 'system-agent',
      userEmail: 'system@novagest.local',
      severity: 'warning'
    }
  ];

  private documentsSubject = new BehaviorSubject<AuditLogDocument[]>(this.loadDocuments());
  public documents$ = this.documentsSubject.asObservable();

  private heartbeatSubscription: Subscription | null = null;

  constructor() {
    this.startHeartbeatSimulation();
  }

  ngOnDestroy(): void {
    this.stopHeartbeatSimulation();
  }

  private loadDocuments(): AuditLogDocument[] {
    try {
      const raw = localStorage.getItem(NOSQL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [...this.initialDocs];
    } catch {
      return [...this.initialDocs];
    }
  }

  private saveDocuments(docs: AuditLogDocument[]): void {
    localStorage.setItem(NOSQL_STORAGE_KEY, JSON.stringify(docs));
    this.documentsSubject.next(docs);
  }

  /**
   * Inicia simulación en tiempo real de eventos NoSQL periódicos (cada 25 segundos)
   */
  private startHeartbeatSimulation(): void {
    this.heartbeatSubscription = interval(25000).subscribe(() => {
      const randomPings = [
        'Sincronización periódica de almacén NoSQL completada sin discrepancias',
        'Comprobación de integridad de tokens JWT y sesiones activas',
        'Telemetría de rendimiento de la PWA: Tiempo de respuesta óptimo (<120ms)',
        'Monitoreo automático de backups en la nube ejecutado'
      ];
      const randomText = randomPings[Math.floor(Math.random() * randomPings.length)];
      this.logActivity('ALERT', 'SYSTEM', randomText, 'info', undefined, 'system-monitor', 'monitor@novagest.local');
    });
  }

  public stopHeartbeatSimulation(): void {
    if (this.heartbeatSubscription) {
      this.heartbeatSubscription.unsubscribe();
      this.heartbeatSubscription = null;
    }
  }

  /**
   * Registra un nuevo documento en la colección NoSQL de auditoría y notifica a los suscriptores en tiempo real
   */
  public logActivity(
    action: AuditAction,
    entity: AuditEntity,
    details: string,
    severity: AuditSeverity = 'info',
    entityId?: string,
    customUserId?: string,
    customUserEmail?: string
  ): Promise<AuditLogDocument> {
    const currentUser = this.authService.currentUserSignal();
    const doc: AuditLogDocument = {
      id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      entity,
      entityId,
      details,
      userId: customUserId || currentUser?.id || 'anonymous',
      userEmail: customUserEmail || currentUser?.email || 'anon@novagest.local',
      severity
    };

    const currentDocs = this.documentsSubject.value;
    const updated = [doc, ...currentDocs].slice(0, 50); // Mantener últimos 50 eventos
    this.saveDocuments(updated);

    return Promise.resolve(doc);
  }

  /**
   * Limpia el historial de documentos NoSQL
   */
  public clearLogs(): void {
    this.saveDocuments([]);
  }

  /**
   * Obtiene flujo de alertas críticas y advertencias
   */
  public getRecentAlerts(): Observable<AuditLogDocument[]> {
    return this.documents$.pipe(
      map(docs => docs.filter(d => d.severity === 'critical' || d.severity === 'warning'))
    );
  }
}
