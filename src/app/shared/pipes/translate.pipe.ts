import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../../core/services/translation.service';

/**
 * Pipe standalone para internacionalización reactiva (i18n).
 * Uso en templates:
 *   {{ 'PRODUCTS.PAGE_TITLE' | translate }}
 *   {{ 'PRODUCTS.CONFIRM_DELETE_MSG' | translate:{ name: 'Impresora' } }}
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // pure: false para reaccionar inmediatamente a los cambios de signal en TranslationService
})
export class TranslatePipe implements PipeTransform {
  private translationService = inject(TranslationService);

  transform(key: string, params?: Record<string, string | number>): string {
    if (!key) return '';
    return this.translationService.t(key, params);
  }
}
