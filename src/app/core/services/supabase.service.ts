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
      !anonKey.includes('PLACEHOLDER') &&
      url.startsWith('https://') &&
      !url.includes('PLACEHOLDER')
    );

    try {
      const clientUrl = (url && url.startsWith('https://') && !url.includes('PLACEHOLDER'))
        ? url
        : 'https://novagest-erp-dam2.supabase.co';
      const clientKey = (anonKey && !anonKey.includes('PLACEHOLDER'))
        ? anonKey
        : 'SUPABASE_ANON_KEY_PLACEHOLDER';

      this.supabaseClient = createClient(
        clientUrl,
        clientKey,
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

  /**
   * Inicia sesión con credenciales en Supabase Auth
   */
  public async signInWithPassword(credentials: { email: string; password: string }) {
    if (!this.supabaseClient) throw new Error('Cliente Supabase no inicializado.');
    return await this.supabaseClient.auth.signInWithPassword(credentials);
  }

  /**
   * Cierra la sesión activa en Supabase Auth
   */
  public async signOut() {
    if (!this.supabaseClient) return;
    return await this.supabaseClient.auth.signOut();
  }

  /**
   * Obtiene la sesión actual desde Supabase Auth
   */
  public async getSession() {
    if (!this.supabaseClient) return { data: { session: null }, error: null };
    return await this.supabaseClient.auth.getSession();
  }

  /**
   * Suscribe a cambios en el estado de autenticación de Supabase Auth
   */
  public onAuthStateChange(callback: (event: any, session: any) => void) {
    if (!this.supabaseClient) return { data: { subscription: { unsubscribe: () => {} } } };
    return this.supabaseClient.auth.onAuthStateChange(callback);
  }
}

