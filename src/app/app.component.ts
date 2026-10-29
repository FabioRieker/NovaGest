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
  businessOutline,
  peopleOutline,
  peopleSharp,
  personAddOutline,
  personAddSharp,
  homeOutline,
  homeSharp,
  globeOutline,
  globeSharp
} from 'ionicons/icons';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { TranslationService } from './core/services/translation.service';
import { TranslatePipe } from './shared/pipes/translate.pipe';
import { LangSwitcherComponent } from './shared/components/lang-switcher/lang-switcher.component';

interface NavPage {
  key: string;
  url: string;
  icon: string;
  adminOnly?: boolean;
}

/**
 * Componente Raíz de la Aplicación (FASE 1 - Paso 1.1).
 * Implementa el sistema de navegación global mediante Side Menu responsivo con IonSplitPane.
 * Adapta dinámicamente las opciones del menú según el rol autenticado (RBAC) e idioma seleccionado (i18n).
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
    IonToggle,
    TranslatePipe,
    LangSwitcherComponent
  ]
})
export class AppComponent {
  public authService = inject(AuthService);
  public translationService = inject(TranslationService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  public isDarkMode = false;

  private readonly allPages: NavPage[] = [
    { key: 'NAV.HOME', url: '/', icon: 'home' },
    { key: 'NAV.DASHBOARD', url: '/dashboard', icon: 'stats-chart', adminOnly: true },
    { key: 'NAV.PRODUCTS', url: '/products', icon: 'cube' },
    { key: 'NAV.NEW_PRODUCT', url: '/product-form', icon: 'add-circle', adminOnly: true },
    { key: 'NAV.REALTIME_AUDIT', url: '/realtime-audit', icon: 'pulse', adminOnly: true },
    { key: 'NAV.USERS', url: '/users', icon: 'people', adminOnly: true },
    { key: 'NAV.REPORTS', url: '/reports', icon: 'document-text' },
    { key: 'NAV.HELP', url: '/help', icon: 'help-circle' }
  ];

  // Páginas visibles filtradas reactivamente según sesión, rol e idioma
  public visiblePages = computed(() => {
    // Suscripción al signal de idioma para recálculo instantáneo
    this.translationService.currentLang();
    const user = this.authService.currentUserSignal();

    const pagesToMap = !user
      ? [
          { key: 'NAV.HOME', url: '/', icon: 'home' },
          { key: 'NAV.LOGIN', url: '/login', icon: 'log-in' },
          { key: 'NAV.HELP', url: '/help', icon: 'help-circle' }
        ]
      : (user.role === 'admin' ? this.allPages : this.allPages.filter(p => !p.adminOnly));

    return pagesToMap.map(p => ({
      title: this.translationService.t(p.key),
      url: p.url,
      icon: p.icon
    }));
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
      businessOutline,
      peopleOutline,
      peopleSharp,
      personAddOutline,
      personAddSharp,
      homeOutline,
      homeSharp,
      globeOutline,
      globeSharp
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
