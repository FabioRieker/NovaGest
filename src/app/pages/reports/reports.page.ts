import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  downloadOutline,
  documentTextOutline,
  printOutline,
  statsChartOutline,
  folderOpenOutline
} from 'ionicons/icons';
import { SqlRestService } from '../../core/services/sql-rest.service';
import { ExportService } from '../../core/services/export.service';
import { Product } from '../../core/models/product.model';

/**
 * Vista de Generación y Exportación de Informes (FASE 3 - Paso 3.3 & RA 5).
 * Permite generar y descargar informes corporativos en formatos estándar PDF y CSV.
 */
@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
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
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class ReportsPage implements OnInit {
  private sqlService = inject(SqlRestService);
  private exportService = inject(ExportService);

  public products = signal<Product[]>([]);
  public isLoading = signal(false);

  constructor() {
    addIcons({
      downloadOutline,
      documentTextOutline,
      printOutline,
      statsChartOutline,
      folderOpenOutline
    });
  }

  ngOnInit(): void {
    this.isLoading.set(true);
    this.sqlService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  public exportPdf(): void {
    this.exportService.exportProductsToPdf(this.products(), 'Informe Consolidado Oficial de Inventario');
  }

  public exportCsv(): void {
    this.exportService.exportProductsToCsv(this.products(), 'Informe_Inventario_NovaGest');
  }
}
