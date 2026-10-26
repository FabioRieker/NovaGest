import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
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
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
  IonIcon,
  IonBadge,
  IonButton
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  helpCircleOutline,
  shieldCheckmarkOutline,
  personOutline,
  documentTextOutline,
  keyOutline,
  accessibilityOutline,
  layersOutline,
  logOutOutline,
  logInOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

/**
 * Manual de Usuario Embebido y Sistema de Ayuda Contextual (RA 6 & FASE 5).
 * Proporciona documentación interactiva integrada en la propia PWA.
 */
@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
    IonIcon,
    IonBadge,
    IonButton
  ]
})
export class HelpPage {
  public authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  constructor() {
    addIcons({
      helpCircleOutline,
      shieldCheckmarkOutline,
      personOutline,
      documentTextOutline,
      keyOutline,
      accessibilityOutline,
      layersOutline,
      logOutOutline,
      logInOutline
    });
  }

  public logout(): void {
    this.authService.logout();
    this.notificationService.showToast('Sesión cerrada correctamente.', 'primary');
    this.router.navigate(['/login']);
  }

  public goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
