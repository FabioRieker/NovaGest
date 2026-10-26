import { Injectable, inject } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular';

/**
 * Servicio centralizado para feedback visual y accesible al usuario (Toasts y Modales).
 * Garantiza cumplimiento de accesibilidad WAI-ARIA mediante regiones en vivo.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  /**
   * Muestra una notificación Toast accesible
   */
  public async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary', duration = 3000): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration,
      color,
      position: 'bottom',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  /**
   * Muestra un diálogo de confirmación accesible
   */
  public async confirm(title: string, message: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: title,
        message,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Confirmar',
            role: 'confirm',
            handler: () => resolve(true)
          }
        ]
      });
      await alert.present();
    });
  }
}
