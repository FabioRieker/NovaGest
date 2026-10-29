import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  lockClosedOutline,
  mailOutline,
  shieldCheckmarkOutline,
  personOutline,
  businessOutline,
  eyeOutline,
  eyeOffOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SupabaseRealtimeService } from '../../core/services/supabase-realtime.service';

/**
 * Página de Autenticación de Usuarios (FASE 1 - Paso 1.2).
 * Implementa Formularios Reactivos, enlace de datos declarativo,
 * gestión estricta de estados UX y accesibilidad WAI-ARIA.
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private realtimeService = inject(SupabaseRealtimeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public loginForm: FormGroup;
  public isLoading = signal(false);
  public showPassword = signal(false);
  public errorMessage = signal<string | null>(null);

  constructor() {
    addIcons({
      lockClosedOutline,
      mailOutline,
      shieldCheckmarkOutline,
      personOutline,
      businessOutline,
      eyeOutline,
      eyeOffOutline
    });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  public togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  /**
   * Rellena rápidamente las credenciales para evaluación del docente
   */
  public fillCredentials(role: 'admin' | 'user'): void {
    if (role === 'admin') {
      this.loginForm.patchValue({
        email: 'admin@empresa.com',
        password: 'Admin1234*'
      });
    } else {
      this.loginForm.patchValue({
        email: 'user@empresa.com',
        password: 'User1234*'
      });
    }
    this.errorMessage.set(null);
  }

  public onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (user) => {
        this.isLoading.set(false);
        this.realtimeService.logActivity(
          'LOGIN',
          'AUTH',
          `Sesión iniciada por ${user.name} (${user.role.toUpperCase()})`,
          'success'
        );
        this.notificationService.showToast(`¡Bienvenido/a, ${user.name}!`, 'success');

        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        const allowedRoutes = ['/dashboard', '/products', '/users', '/realtime-audit', '/reports', '/help', '/product-form'];
        const isSafeReturnUrl = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
          && allowedRoutes.some(route => returnUrl === route || returnUrl.startsWith(`${route}/`) || returnUrl.startsWith(`${route}?`));

        if (isSafeReturnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else if (user.role === 'admin') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/products']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.message || 'Error al iniciar sesión.';
        this.errorMessage.set(msg);
        this.realtimeService.logActivity(
          'LOGIN',
          'AUTH',
          `Intento fallido de inicio de sesión con email: ${credentials.email}`,
          'warning'
        );
      }
    });
  }
}
