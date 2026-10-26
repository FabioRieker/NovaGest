import { Component, inject, computed, effect } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonListHeader,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink,
  IonBadge,
  IonButton,
  IonToggle
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  statsChartOutline,
  statsChartSharp,
  cubeOutline,
  cubeSharp,
  addCircleOutline,
  addCircleSharp,
  pulseOutline,
  pulseSharp,
  documentTextOutline,
  documentTextSharp,
  helpCircleOutline,
  helpCircleSharp,
  logOutOutline,
  logOutSharp,
  logInOutline,
  logInSharp,
  moonOutline,
  moonSharp,
  sunnyOutline,
  sunnySharp,
  personCircleOutline,
  shieldCheckmarkOutline,
  businessOutline
} from 'ionicons/icons';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';

interface NavPage {
  title: string;
  url: string;
  icon: string;
  adminOnly?: boolean;
}

/**
 * Componente Raíz de la Aplicación (FASE 1 - Paso 1.1).
 * Implementa el sistema de navegación global mediante Side Menu responsivo con IonSplitPane.
 * Adapta dinámicamente las opciones del menú según el rol autenticado (RBAC).
 */
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonListHeader,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonRouterLink,
    IonRouterOutlet,
    IonBadge,
    IonButton,
    IonToggle
  ]
})
export class AppComponent {
  public authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  public isDarkMode = false;

  private readonly allPages: NavPage[] = [
    { title: 'Cuadro de Mando', url: '/dashboard', icon: 'stats-chart', adminOnly: true },
    { title: 'Inventario & Catálogo', url: '/products', icon: 'cube' },
    { title: 'Alta de Producto', url: '/product-form', icon: 'add-circle', adminOnly: true },
    { title: 'Auditoría NoSQL en Vivo', url: '/realtime-audit', icon: 'pulse', adminOnly: true },
    { title: 'Informes & Exportación', url: '/reports', icon: 'document-text' },
    { title: 'Manual de Usuario', url: '/help', icon: 'help-circle' }
  ];

  // Páginas visibles filtradas reactivamente según sesión y rol
  public visiblePages = computed(() => {
    const user = this.authService.currentUserSignal();
    if (!user) {
      return [
        { title: 'Iniciar Sesión', url: '/login', icon: 'log-in' },
        { title: 'Manual de Usuario', url: '/help', icon: 'help-circle' }
      ];
    }

    if (user.role === 'admin') {
      return this.allPages;
    }

    return this.allPages.filter(p => !p.adminOnly);
  });

  constructor() {
    addIcons({
      statsChartOutline,
      statsChartSharp,
      cubeOutline,
      cubeSharp,
      addCircleOutline,
      addCircleSharp,
      pulseOutline,
      pulseSharp,
      documentTextOutline,
      documentTextSharp,
      helpCircleOutline,
      helpCircleSharp,
      logOutOutline,
      logOutSharp,
      logInOutline,
      logInSharp,
      moonOutline,
      moonSharp,
      sunnyOutline,
      sunnySharp,
      personCircleOutline,
      shieldCheckmarkOutline,
      businessOutline
    });

    this.checkInitialTheme();
  }

  private checkInitialTheme(): void {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('novagest_theme');
    this.isDarkMode = savedTheme ? savedTheme === 'dark' : prefersDark;
    document.body.classList.toggle('dark', this.isDarkMode);
  }

  public toggleTheme(event: any): void {
    this.isDarkMode = event.detail.checked;
    document.body.classList.toggle('dark', this.isDarkMode);
    localStorage.setItem('novagest_theme', this.isDarkMode ? 'dark' : 'light');
  }

  public logout(): void {
    this.authService.logout();
    this.notificationService.showToast('Sesión cerrada correctamente.', 'primary');
    this.router.navigate(['/login']);
  }
}
