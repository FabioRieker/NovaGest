import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { lockClosedOutline, arrowBackOutline, logOutOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LangSwitcherComponent } from '../../shared/components/lang-switcher/lang-switcher.component';

/**
 * Página de Acceso Denegado (RBAC Guard fallback).
 */
@Component({
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.page.html',
  styleUrls: ['./unauthorized.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    TranslatePipe,
    LangSwitcherComponent
  ]
})
export class UnauthorizedPage {
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    addIcons({ lockClosedOutline, arrowBackOutline, logOutOutline });
  }

  public goBack(): void {
    this.router.navigate(['/products']);
  }

  public switchAccount(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
