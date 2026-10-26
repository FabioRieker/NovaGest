import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { User, UserCredentials, AuthSession, UserRole } from '../models/user.model';

const STORAGE_KEY = 'novagest_auth_session';

/**
 * Servicio Central de Autenticación y Control de Acceso por Roles (RBAC).
 * Implementa gestión reactiva con RxJS y Angular Signals para optimización de renderizado.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Lista de usuarios preconfigurados del sistema
  private readonly mockUsers: Array<User & { password: string }> = [
    {
      id: 'usr-admin-001',
      name: 'Fabio Rieker (Admin)',
      email: 'admin@empresa.com',
      password: 'Admin1234*',
      role: 'admin',
      avatar: 'assets/icon/favicon.png',
      department: 'Dirección General & TI',
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
      createdAt: '2026-02-01T09:30:00Z'
    }
  ];

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
        const found = this.mockUsers.find(
          u => u.email.toLowerCase() === credentials.email.trim().toLowerCase() && u.password === credentials.password
        );

        if (!found) {
          throw new Error('Credenciales inválidas. Compruebe su correo o contraseña.');
        }

        const user: User = {
          id: found.id,
          name: found.name,
          email: found.email,
          role: found.role,
          avatar: found.avatar,
          department: found.department,
          createdAt: found.createdAt
        };

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
        return this.mockUsers.some(u => u.email.toLowerCase() === clean);
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
