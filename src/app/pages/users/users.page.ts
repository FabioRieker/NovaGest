import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonIcon,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  AlertController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personAddOutline,
  personAddSharp,
  peopleOutline,
  peopleSharp,
  shieldCheckmarkOutline,
  shieldCheckmarkSharp,
  personOutline,
  personSharp,
  mailOutline,
  lockClosedOutline,
  callOutline,
  businessOutline,
  trashOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  refreshOutline,
  eyeOutline,
  eyeOffOutline,
  keyOutline,
  filterOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SupabaseRealtimeService } from '../../core/services/supabase-realtime.service';
import { User, UserRole } from '../../core/models/user.model';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonIcon,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonLabel
  ]
})
export class UsersPage implements OnInit {
  private fb = inject(FormBuilder);
  public authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private realtimeService = inject(SupabaseRealtimeService);
  private alertCtrl = inject(AlertController);

  public userForm: FormGroup;
  public users = signal<User[]>([]);
  public isLoading = signal(false);
  public isSubmitting = signal(false);
  public showPassword = signal(false);
  public showConfirmPassword = signal(false);
  public selectedTab = signal<'create' | 'list'>('create');

  public searchQuery = signal('');
  public filterRole = signal<'ALL' | 'admin' | 'user'>('ALL');

  // Métricas calculadas
  public totalUsersCount = computed(() => this.users().length);
  public adminCount = computed(() => this.users().filter(u => u.role === 'admin').length);
  public standardCount = computed(() => this.users().filter(u => u.role === 'user').length);
  public departmentsCount = computed(() => {
    const deps = new Set(this.users().map(u => u.department).filter(Boolean));
    return deps.size;
  });

  // Lista filtrada de usuarios
  public filteredUsers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const role = this.filterRole();

    return this.users().filter(u => {
      const matchRole = role === 'ALL' || u.role === role;
      const matchQuery = !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q));
      return matchRole && matchQuery;
    });
  });

  // Medidor dinámico de seguridad de contraseña
  public passwordStrength = signal<{ score: number; label: string; color: string }>({
    score: 0,
    label: 'Sin ingresar',
    color: 'medium'
  });

  constructor() {
    addIcons({
      personAddOutline,
      personAddSharp,
      peopleOutline,
      peopleSharp,
      shieldCheckmarkOutline,
      shieldCheckmarkSharp,
      personOutline,
      personSharp,
      mailOutline,
      lockClosedOutline,
      callOutline,
      businessOutline,
      trashOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      refreshOutline,
      eyeOutline,
      eyeOffOutline,
      keyOutline,
      filterOutline
    });

    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', [Validators.required]],
      department: ['Operaciones & Logística', [Validators.required]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });

    // Escuchar cambios de contraseña para evaluar fuerza
    this.userForm.get('password')?.valueChanges.subscribe(val => {
      this.evaluatePasswordStrength(val || '');
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  public loadUsers(): void {
    this.isLoading.set(true);
    this.authService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando usuarios:', err);
        this.isLoading.set(false);
      }
    });
  }

  private evaluatePasswordStrength(pass: string): void {
    if (!pass) {
      this.passwordStrength.set({ score: 0, label: 'Sin ingresar', color: 'medium' });
      return;
    }

    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) {
      this.passwordStrength.set({ score: 25, label: 'Débil', color: 'danger' });
    } else if (score <= 3) {
      this.passwordStrength.set({ score: 60, label: 'Media', color: 'warning' });
    } else {
      this.passwordStrength.set({ score: 100, label: 'Robusta', color: 'success' });
    }
  }

  public togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  public toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  public selectRole(role: UserRole): void {
    this.userForm.patchValue({ role });
  }

  public onTabChange(event: any): void {
    const val = event?.detail?.value;
    if (val === 'create' || val === 'list') {
      this.selectedTab.set(val);
    }
  }

  public onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.userForm.value;

    this.authService.createUser({
      name: formVal.name,
      email: formVal.email,
      password: formVal.password,
      role: formVal.role,
      department: formVal.department,
      phone: formVal.phone
    }).subscribe({
      next: (createdUser) => {
        this.isSubmitting.set(false);
        this.notificationService.showToast(`¡Cuenta para ${createdUser.name} creada exitosamente!`, 'success');

        // Registro de auditoría Supabase Realtime en vivo
        this.realtimeService.logActivity(
          'CREATE',
          'AUTH',
          `Alta de usuario: ${createdUser.name} (${createdUser.email}) con rol [${createdUser.role.toUpperCase()}]`,
          'info'
        );

        this.userForm.reset({
          role: 'user',
          department: 'Operaciones & Logística'
        });
        this.passwordStrength.set({ score: 0, label: 'Sin ingresar', color: 'medium' });

        this.loadUsers();
        this.selectedTab.set('list');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err.message || 'No se pudo crear el usuario.';
        this.notificationService.showToast(msg, 'danger');
      }
    });
  }

  public async confirmDelete(user: User): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Eliminación',
      subHeader: `¿Desea eliminar la cuenta de ${user.name}?`,
      message: 'Esta acción revocará de forma permanente el acceso al sistema.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.deleteUser(user);
          }
        }
      ]
    });

    await alert.present();
  }

  private deleteUser(user: User): void {
    this.authService.deleteUser(user.id).subscribe({
      next: () => {
        this.notificationService.showToast(`Cuenta de ${user.name} eliminada.`, 'success');
        this.realtimeService.logActivity(
          'DELETE',
          'AUTH',
          `Eliminación de cuenta de usuario: ${user.email}`,
          'warning'
        );
        this.loadUsers();
      },
      error: (err) => {
        const msg = err.message || 'Error al eliminar el usuario.';
        this.notificationService.showToast(msg, 'danger');
      }
    });
  }
}
