import { Injectable, signal, computed } from '@angular/core';
import { SupportedLang, TRANSLATIONS } from '../i18n/translations';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly STORAGE_KEY = 'novagest_lang';

  /** Signal reactivo con el idioma actual ('es' | 'en') */
  public readonly currentLang = signal<SupportedLang>(this.getInitialLang());

  /** Idiomas soportados */
  public readonly availableLanguages: { code: SupportedLang; label: string; flag: string }[] = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
  ];

  /** Nombre del idioma actual en formato legible */
  public readonly currentLangLabel = computed(() => {
    const lang = this.currentLang();
    return lang === 'es' ? 'Español' : 'English';
  });

  constructor() {
    this.applyHtmlLang(this.currentLang());
  }

  private getInitialLang(): SupportedLang {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY) as SupportedLang | null;
      if (saved === 'es' || saved === 'en') {
        return saved;
      }
      // Opcional: detectar el idioma del navegador
      const browserLang = navigator.language?.toLowerCase() || '';
      if (browserLang.startsWith('en')) {
        return 'en';
      }
    } catch {
      // Ignorar fallo en entornos sin acceso a localStorage
    }
    return 'es';
  }

  /**
   * Cambia el idioma activo de la aplicación instantáneamente.
   */
  public setLanguage(lang: SupportedLang): void {
    if (lang !== 'es' && lang !== 'en') return;
    this.currentLang.set(lang);
    try {
      localStorage.setItem(this.STORAGE_KEY, lang);
    } catch {
      // localStorage no disponible
    }
    this.applyHtmlLang(lang);
  }

  /**
   * Alterna entre español e inglés de forma rápida.
   */
  public toggleLanguage(): void {
    const nextLang = this.currentLang() === 'es' ? 'en' : 'es';
    this.setLanguage(nextLang);
  }

  /**
   * Obtiene la traducción para una clave con notación de punto (ej: 'NAV.PRODUCTS').
   * Permite interpolación de parámetros {paramName}.
   */
  public t(key: string, params?: Record<string, string | number>): string {
    const lang = this.currentLang();
    let text = this.resolveKey(TRANSLATIONS[lang], key);

    // Fallback a español si no se encuentra en inglés
    if (!text && lang !== 'es') {
      text = this.resolveKey(TRANSLATIONS['es'], key);
    }

    if (!text) {
      return key; // Devolver la clave original si no existe traducción
    }

    if (params) {
      for (const [pKey, pVal] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }
    }

    return text;
  }

  private resolveKey(obj: Record<string, any>, key: string): string | null {
    if (!obj || !key) return null;
    const parts = key.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    return typeof current === 'string' ? current : null;
  }

  private applyHtmlLang(lang: SupportedLang): void {
    try {
      document.documentElement.lang = lang;
    } catch {
      // Entorno no navegador
    }
  }
}
