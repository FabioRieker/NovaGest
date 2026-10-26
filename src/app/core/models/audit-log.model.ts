/**
 * Modelo de Documento NoSQL para el servicio en tiempo real (tipo Firestore).
 * Representa logs de auditoría, trazabilidad y métricas del sistema.
 */

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'ALERT';
export type AuditEntity = 'PRODUCT' | 'AUTH' | 'REPORT' | 'SYSTEM';
export type AuditSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface AuditLogDocument {
  id: string;
  timestamp: string; // ISO String
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  details: string;
  userId: string;
  userEmail: string;
  severity: AuditSeverity;
}
