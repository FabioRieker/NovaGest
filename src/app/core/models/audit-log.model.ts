/**
 * Modelo de Registro de Auditoría y Trazabilidad para Supabase Realtime (PostgreSQL) - RA 5.
 * Representa eventos de auditoría, trazabilidad y telemetría transmitidos en tiempo real.
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
