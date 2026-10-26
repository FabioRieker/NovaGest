import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  trendingUpOutline,
  trendingDownOutline,
  removeOutline,
  cubeOutline,
  cashOutline,
  alertCircleOutline,
  statsChartOutline,
  checkmarkCircleOutline,
  peopleOutline
} from 'ionicons/icons';

/**
 * Componente Visual Personalizado 2: Widget Estadístico / KPI Reutilizable (RA 3).
 * Componente agnóstico para representación de métricas empresariales.
 * Recibe datos vía @Input(), emite eventos vía @Output() y utiliza ChangeDetectionStrategy.OnPush.
 */
@Component({
  selector: 'app-stat-widget',
  templateUrl: './stat-widget.component.html',
  styleUrls: ['./stat-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class StatWidgetComponent {
  @Input() title = '';
  @Input() value: string | number = '0';
  @Input() subtitle?: string;
  @Input() trend?: 'up' | 'down' | 'neutral';
  @Input() trendPercentage?: number;
  @Input() icon = 'stats-chart-outline';
  @Input() color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' = 'primary';
  @Input() clickable = false;

  @Output() widgetClick = new EventEmitter<void>();

  constructor() {
    addIcons({
      trendingUpOutline,
      trendingDownOutline,
      removeOutline,
      cubeOutline,
      cashOutline,
      alertCircleOutline,
      statsChartOutline,
      checkmarkCircleOutline,
      peopleOutline
    });
  }

  public onClick(): void {
    if (this.clickable) {
      this.widgetClick.emit();
    }
  }

  public onKeyDown(event: KeyboardEvent): void {
    if (this.clickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.widgetClick.emit();
    }
  }
}
