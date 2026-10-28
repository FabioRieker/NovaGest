import { Injectable, signal, computed, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { User, UserCredentials, AuthSession, UserRole } from '../models/user.model';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'novagest_auth_session';
const USERS_STORAGE_KEY = 'novagest_users_db';

/**
 * Servicio Central de Autenticación y Control de Acceso por Roles (RBAC).
 * Implementa gestión reactiva con RxJS y Angular Signals para optimización de renderizado,
 * conectado a Supabase PostgreSQL para persistencia relacional.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabaseService = inject(SupabaseService);

  // Lista de usuarios iniciales preconfigurados
  private readonly defaultUsers: Array<User & { password: string }> = [
    {
      id: 'usr-admin-001',
      name: 'Fabio Rieker (Admin)',
      email: 'admin@empresa.com',
      password: 'Admin1234*',
      role: 'admin',
      avatar: 'assets/icon/favicon.png',
      department: 'Dirección General & TI',
      phone: '+34 600 123 456',
      status: 'active',
      createdAt: '2026-01-15T08:00:00Z'
    },
    {
      id: 'usr-std-002',
      name: 'Usuario Estándar Demo',
      email: 'user@empresa.com',
      password: 'User1234*',
      role: 'user',
      avatar: 'assets/icon/favicon.png',
      department: 'Operaciones & Logística',
      phone: '+34 611 789 012',
      status: 'active',
      createdAt: '2026-02-01T09:30:00Z'
    }
  ];

  // Almacén de usuarios reactivo
  private usersSubject = new BehaviorSubject<Array<User & { password: string }>>(this.loadUsers());
  public users$ = this.usersSubject.asObservable().pipe(
    map(users => users.map(u => this.sanitizeUser(u)))
  );

  // Estado reactivo con BehaviorSubject y Signals
  private sessionSubject = new BehaviorSubject<AuthSession | null>(this.loadSession());
  public session$ = this.sessionSubject.asObservable();

  // Angular Signal para alto rendimiento y ChangeDetectionStrategy.OnPush
  public currentUserSignal = signal<User | null>(this.sessionSubject.value?.user ?? null);
  public isAuthenticatedSignal = computed(() => !!this.currentUserSignal());
  public isAdminSignal = computed(() => this.currentUserSignal()?.role === 'admin');

  constructor() {
    // Sincronizar el signal cuando cambia el Subject
    this.session$.subscribe(session => {
      this.currentUserSignal.set(session?.user ?? null);
    });
    this.syncUsersWithSupabase();
  }

  /**
   * Carga los usuarios persistidos en LocalStorage o inicializa con los predeterminados
   */
  private loadUsers(): Array<User & { password: string }> {
    try {
      const data = localStorage.getItem(USERS_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error leyendo usuarios de localStorage, restaurando predeterminados', e);
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.defaultUsers));
    return [...this.defaultUsers];
  }

  private persistUsers(users: Array<User & { password: string }>): void {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    this.usersSubject.next(users);
  }

  private sanitizeUser(u: User & { password?: string }): User {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar || 'assets/icon/favicon.png',
      department: u.department || 'General',
      phone: u.phone,
      status: u.status || 'active',
      createdAt: u.createdAt
    };
  }

  /**
   * Sincroniza la lista de usuarios con la tabla 'public.users' en Supabase PostgreSQL
   */
  public async syncUsersWithSupabase(): Promise<void> {
    const client = this.supabaseService.client;
    if (!client || !this.supabaseService.isConfigured) return;

    try {
      const { data, error } = await client
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Aviso sincronizando usuarios con Supabase:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const currentLocal = this.usersSubject.value;
        const merged: Array<User & { password: string }> = data.map((dbUser: any) => {
          const local = currentLocal.find(u => u.id === dbUser.id || u.email.toLowerCase() === dbUser.email.toLowerCase());
          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: (dbUser.role === 'admin' ? 'admin' : 'user') as UserRole,
            password: local?.password || 'User1234*',
            avatar: local?.avatar || 'assets/icon/favicon.png',
            department: local?.department || (dbUser.role === 'admin' ? 'Dirección General & TI' : 'Operaciones & Logística'),
            phone: local?.phone || '',
            status: 'active',
            createdAt: dbUser.created_at || new Date().toISOString()
          };
        });

        for (const local of currentLocal) {
          if (!merged.some(m => m.id === local.id || m.email.toLowerCase() === local.email.toLowerCase())) {
            // Sincronizar usuarios locales hacia Supabase para que aparezcan en el panel
            if (local.id && local.email && local.name && client) {
              try {
                await client.from('users').insert({
                  id: local.id,
                  email: local.email.toLowerCase(),
                  name: local.name,
                  role: local.role,
                  created_at: local.createdAt || new Date().toISOString()
                });
              } catch {}
            }
            merged.push(local);
          }
        }

        this.persistUsers(merged);
      }
    } catch (e) {
      console.warn('Fallo de conexión al sincronizar usuarios de Supabase:', e);
    }
  }

  /**
   * Obtiene la lista de usuarios sanitizados sincronizada en vivo con Supabase
   */
  public getUsers(): Observable<User[]> {
    return from((async () => {
      await this.syncUsersWithSupabase();
      return this.usersSubject.value.map(u => this.sanitizeUser(u));
    })());
  }

  /**
   * Crea una nueva cuenta de usuario con inserción directa en Supabase PostgreSQL
   */
  public createUser(userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department?: string;
    phone?: string;
  }): Observable<User> {
    return from((async () => {
      const currentUsers = this.usersSubject.value;
      const cleanEmail = userData.email.trim().toLowerCase();

      if (currentUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
        throw new Error(`El correo ${userData.email} ya está registrado.`);
      }

      const newId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();

      // Inserción en la base de datos Supabase
      const client = this.supabaseService.client;
      if (client && this.supabaseService.isConfigured) {
        const { error } = await client.from('users').insert({
          id: newId,
          email: cleanEmail,
          name: userData.name.trim(),
          role: userData.role,
          created_at: nowIso
        });

        if (error) {
          console.error('Error insertando usuario en Supabase:', error);
          if (error.code === '42501') {
            throw new Error('Supabase RLS: Recuerda ejecutar la política de inserción en el SQL Editor de Supabase (CREATE POLICY "Inserción de usuarios" ON public.users FOR INSERT WITH CHECK (true);).');
          }
          throw new Error(`Error en Supabase: ${error.message}`);
        }
      }

      const newUser: User & { password: string } = {
        id: newId,
        name: userData.name.trim(),
        email: cleanEmail,
        password: userData.password,
        role: userData.role,
        avatar: 'assets/icon/favicon.png',
        department: userData.department?.trim() || 'Operaciones',
        phone: userData.phone?.trim() || '',
        status: 'active',
        createdAt: nowIso
      };

      const updated = [...this.usersSubject.value, newUser];
      this.persistUsers(updated);
      return this.sanitizeUser(newUser);
    })());
  }

  /**
   * Elimina un usuario por su ID tanto en Supabase como en local
   */
  public deleteUser(userId: string): Observable<boolean> {
    return from((async () => {
      const current = this.usersSubject.value;
      const target = current.find(u => u.id === userId);

      if (!target) {
        throw new Error('Usuario no encontrado.');
      }

      if (target.email === 'admin@empresa.com') {
        throw new Error('No es posible eliminar la cuenta del Administrador principal del sistema.');
      }

      if (this.currentUserSignal()?.id === userId) {
        throw new Error('No puedes eliminar tu propia cuenta en sesión activa.');
      }

      const client = this.supabaseService.client;
      if (client && this.supabaseService.isConfigured) {
        const { error } = await client.from('users').delete().eq('id', userId);
        if (error) {
          console.warn('Error eliminando de Supabase:', error.message);
        }
      }

      const filtered = current.filter(u => u.id !== userId);
      this.persistUsers(filtered);
      return true;
    })());
  }

  /**
   * Carga la sesión persistida desde LocalStorage si el token no ha expirado
   */
  private loadSession(): AuthSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      const session: AuthSession = JSON.parse(data);
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  /**
   * Simula inicio de sesión asíncrono con verificación de credenciales y generación de JWT
   */
  public login(credentials: UserCredentials): Observable<User> {
    return of(null).pipe(
      delay(600), // Simula latencia de red de 600ms
      map(() => {
        const currentUsers = this.usersSubject.value;
        const found = currentUsers.find(
          u => u.email.toLowerCase() === credentials.email.trim().toLowerCase() && u.password === credentials.password
        );

        if (!found) {
          throw new Error('Credenciales inválidas. Compruebe su correo o contraseña.');
        }

        const user = this.sanitizeUser(found);

        // Generar JWT simulado
        const token = this.generateMockJwt(user);
        const session: AuthSession = {
          user,
          token,
          expiresAt: Date.now() + 8 * 60 * 60 * 1000 // 8 horas
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        this.sessionSubject.next(session);

        return user;
      })
    );
  }

  /**
   * Cierra la sesión activa y limpia tokens
   */
  public logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.sessionSubject.next(null);
  }

  /**
   * Obtiene el token de autenticación actual
   */
  public getToken(): string | null {
    const session = this.sessionSubject.value;
    if (session && Date.now() < session.expiresAt) {
      return session.token;
    }
    return null;
  }

  /**
   * Comprueba si el usuario autenticado tiene un rol específico
   */
  public hasRole(role: UserRole): boolean {
    const user = this.currentUserSignal();
    return user?.role === role;
  }

  /**
   * Validación asíncrona para comprobar si un correo ya existe en base de datos
   * Utilizado en validadores reactivos de formularios
   */
  public checkEmailExists(email: string): Observable<boolean> {
    return of(null).pipe(
      delay(400),
      map(() => {
        const clean = email.trim().toLowerCase();
        return this.usersSubject.value.some(u => u.email.toLowerCase() === clean);
      })
    );
  }

  /**
   * Genera un token JWT sintético válido con payload base64
   */
  private generateMockJwt(user: User): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 28800
    }));
    const signature = btoa('novagest_secure_hmac_sha256_mock_signature');
    return `${header}.${payload}.${signature}`;
  }
}
