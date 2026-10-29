import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonIcon,
  IonContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  statsChartOutline,
  cubeOutline,
  pulseOutline,
  shieldCheckmarkOutline,
  documentTextOutline,
  arrowForwardOutline,
  logInOutline,
  helpCircleOutline,
  sparklesOutline,
  peopleOutline,
  hardwareChipOutline,
  speedometerOutline,
  lockClosedOutline,
  checkmarkCircleOutline,
  logoGithub
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LangSwitcherComponent } from '../../shared/components/lang-switcher/lang-switcher.component';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonIcon,
    IonContent,
    TranslatePipe,
    LangSwitcherComponent
  ]
})
export class WelcomePage {
  public authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    addIcons({
      businessOutline,
      statsChartOutline,
      cubeOutline,
      pulseOutline,
      shieldCheckmarkOutline,
      documentTextOutline,
      arrowForwardOutline,
      logInOutline,
      helpCircleOutline,
      sparklesOutline,
      peopleOutline,
      hardwareChipOutline,
      speedometerOutline,
      lockClosedOutline,
      checkmarkCircleOutline,
      logoGithub
    });
  }

  public navigateToPrimaryAction(): void {
    if (this.authService.isAuthenticatedSignal()) {
      const user = this.authService.currentUserSignal();
      if (user?.role === 'admin') {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/products']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  public navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  public navigateToHelp(): void {
    this.router.navigate(['/help']);
  }
}
