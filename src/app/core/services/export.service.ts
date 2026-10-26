import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.model';
import { AuthService } from './auth.service';
import { SupabaseRealtimeService } from './supabase-realtime.service';

/**
 * Servicio para generación y descarga de informes tabulados en PDF y CSV (RA 5).
 * Implementa diseño corporativo profesional, metadatos y codificación estándar UTF-8 con BOM.
 */
@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private authService = inject(AuthService);
  private realtimeService = inject(SupabaseRealtimeService);

  /**
   * Genera un informe formal en PDF tabulado con diseño profesional (carga perezosa de librerías PDF)
   */
  public async exportProductsToPdf(products: Product[], title = 'Informe de Inventario y Catálogo'): Promise<void> {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const currentUser = this.authService.currentUserSignal();
    const currentDate = new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' });

    // Cabecera Corporativa
    doc.setFillColor(30, 58, 138); // Azul corporativo (#1E3A8A)
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('NOVAGEST ERP - GESTIÓN EMPRESARIAL', 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), 14, 24);

    // Metadatos de emisión
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.text(`Fecha de emisión: ${currentDate}`, 14, 40);
    doc.text(`Generado por: ${currentUser?.name || 'Administrador'} (${currentUser?.email || 'N/A'})`, 14, 46);
    doc.text(`Total de registros: ${products.length} artículos`, 14, 52);

    // Mapeo de datos para la tabla
    const tableData = products.map(p => [
      p.sku,
      p.name,
      p.category,
      `${p.price.toFixed(2)} €`,
      p.stock.toString(),
      p.status === 'in_stock' ? 'En Stock' : (p.status === 'low_stock' ? 'Stock Bajo' : 'Agotado'),
      `${(p.price * p.stock).toFixed(2)} €`
    ]);

    const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);

    // Inserción de tabla con jsPDF-AutoTable
    autoTable(doc, {
      startY: 58,
      head: [['SKU', 'Nombre de Producto', 'Categoría', 'Precio Unit.', 'Stock', 'Estado', 'Valor Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [37, 99, 235], // Azul primario
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      foot: [['', '', '', '', '', 'TOTAL VALOR:', `${totalValue.toFixed(2)} €`]],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 9
      },
      didDrawPage: (data) => {
        // Pie de página con numeración
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount} - NovaGest ERP Documento Oficial Confidencial`,
          14,
          doc.internal.pageSize.height - 10
        );
      }
    });

    const fileName = `Informe_Inventario_NovaGest_${Date.now()}.pdf`;
    doc.save(fileName);

    // Registrar en auditoría Supabase Realtime
    this.realtimeService.logActivity(
      'EXPORT',
      'REPORT',
      `Exportación de informe PDF completada (${products.length} productos incluidos).`,
      'info'
    );
  }

  /**
   * Genera y descarga un archivo CSV compatible con RFC 4180 y Microsoft Excel (UTF-8 con BOM)
   */
  public exportProductsToCsv(products: Product[], filename = 'Inventario_NovaGest'): void {
    const headers = ['ID', 'SKU', 'Nombre', 'Categoria', 'Precio_EUR', 'Stock', 'Estado', 'Email_Proveedor', 'Fecha_Registro'];

    const rows = products.map(p => [
      p.id,
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.price.toFixed(2),
      p.stock,
      p.status,
      p.supplierEmail,
      p.createdAt
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\r\n');

    // Añadir BOM (\uFEFF) para garantizar correcta visualización de tildes y caracteres especiales en Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Registrar en auditoría Supabase Realtime
    this.realtimeService.logActivity(
      'EXPORT',
      'REPORT',
      `Exportación de datos tabulados a CSV completada (${products.length} filas).`,
      'info'
    );
  }
}
