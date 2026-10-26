import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  IonBadge
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  helpCircleOutline,
  shieldCheckmarkOutline,
  personOutline,
  documentTextOutline,
  keyOutline,
  accessibilityOutline,
  layersOutline
} from 'ionicons/icons';

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
    IonBadge
  ]
})
export class HelpPage {
  constructor() {
    addIcons({
      helpCircleOutline,
      shieldCheckmarkOutline,
      personOutline,
      documentTextOutline,
      keyOutline,
      accessibilityOutline,
      layersOutline
    });
  }
}
