import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';

/**
 * Servicio de Almacenamiento en la Nube mediante Supabase Storage Buckets.
 * Gestiona la subida, obtención de URL pública y eliminación de recursos multimedia
 * (fotografías de catálogo e inventario) con fallback transparente para desarrollo local.
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private supabaseService = inject(SupabaseService);
  private notificationService = inject(NotificationService);

  public readonly bucketName = 'product-images';

  /**
   * Sube una imagen de producto al bucket de Supabase Storage.
   * Si el bucket o cliente no están disponibles, realiza fallback local a Base64 DataURL.
   */
  public async uploadProductImage(file: File, skuOrId: string): Promise<string> {
    const client = this.supabaseService.client;
    const cleanIdentifier = (skuOrId || 'prod').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${cleanIdentifier}_${Date.now()}.${extension}`;

    // 1. Intentar subida a Supabase Storage oficial
    if (client && this.supabaseService.isConfigured) {
      try {
        const { data, error } = await client.storage
          .from(this.bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          });

        if (error) {
          console.warn('Aviso en Supabase Storage (se aplicará fallback local):', error.message);
        } else if (data) {
          const { data: publicUrlData } = client.storage
            .from(this.bucketName)
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn('Excepción al conectar con Supabase Storage:', err);
      }
    }

    // 2. Fallback resiliente: conversión a Base64 para visualización instantánea y persistencia local
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Elimina un archivo de imagen del bucket de Supabase Storage
   */
  public async deleteProductImage(imageUrl: string): Promise<boolean> {
    if (!imageUrl || imageUrl.startsWith('data:')) {
      return true;
    }

    const client = this.supabaseService.client;
    if (client && this.supabaseService.isConfigured) {
      try {
        const parts = imageUrl.split('/');
        const fileName = parts[parts.length - 1];
        if (fileName) {
          const { error } = await client.storage.from(this.bucketName).remove([fileName]);
          if (error) {
            console.warn('Aviso al eliminar de Supabase Storage:', error.message);
          }
        }
      } catch (e) {
        console.warn('Error eliminando imagen de storage:', e);
      }
    }
    return true;
  }
}
