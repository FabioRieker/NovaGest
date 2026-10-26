/**
 * Definición de modelos para el sistema de usuarios y autenticación.
 * Cumple con el estándar de tipos para control de acceso basado en roles (RBAC).
 */

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  createdAt: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number; // Timestamp en milisegundos
}
