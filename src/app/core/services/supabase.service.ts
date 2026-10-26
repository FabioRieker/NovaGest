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
    const url = environment.supabase?.url;
    const anonKey = environment.supabase?.anonKey;

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
   * Obtiene la instancia activa del cliente Supabase
   */
  public get client(): SupabaseClient | null {
    return this.supabaseClient;
  }
}
