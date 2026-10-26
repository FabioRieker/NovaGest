import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Servicio Central de Conexión a Supabase (PostgreSQL + Supabase Realtime) - RA 5.
 * Proporciona acceso unificado al cliente oficial de Supabase, gestionando
 * consultas SQL (PostgREST), autenticación y canales WebSocket en tiempo real.
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabaseClient: SupabaseClient | null = null;
  public readonly isConfigured: boolean;

  constructor() {
    // Prioridad de resolución de credenciales seguras (evita exposición de tokens reales en Git):
    // 1. Sobrescritura en tiempo de ejecución (localStorage / window.__SUPABASE_*)
    // 2. Variables de compilación en environment.ts / .env
    const runtimeUrl = typeof window !== 'undefined'
      ? (localStorage.getItem('novagest_supabase_url') || (window as any).__SUPABASE_URL)
      : null;
    const runtimeKey = typeof window !== 'undefined'
      ? (localStorage.getItem('novagest_supabase_anon_key') || (window as any).__SUPABASE_ANON_KEY)
      : null;

    const url = runtimeUrl || environment.supabase?.url;
    const anonKey = runtimeKey || environment.supabase?.anonKey;

    // Detectar si está configurado con credenciales válidas
    this.isConfigured = Boolean(
      url &&
      anonKey &&
      !anonKey.includes('dummy_anon_key') &&
      url.startsWith('https://')
    );

    try {
      this.supabaseClient = createClient(
        url || 'https://novagest-erp-dam2.supabase.co',
        anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_dam2_interfaces_evaluation',
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        }
      );
    } catch (error) {
      console.warn('Inicialización de cliente Supabase en modo simulado / contingencia:', error);
      this.supabaseClient = null;
    }
  }

  /**
   * Configura dinámicamente credenciales protegidas en tiempo de ejecución
   * sin exponer claves en el código fuente de Git.
   */
  public setCustomCredentials(url: string, anonKey: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('novagest_supabase_url', url.trim());
      localStorage.setItem('novagest_supabase_anon_key', anonKey.trim());
      window.location.reload();
    }
  }

  /**
   * Elimina las credenciales personalizadas locales
   */
  public clearCustomCredentials(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('novagest_supabase_url');
      localStorage.removeItem('novagest_supabase_anon_key');
      window.location.reload();
    }
  }

  /**
   * Obtiene la instancia activa del cliente Supabase
   */
  public get client(): SupabaseClient | null {
    return this.supabaseClient;
  }
}

