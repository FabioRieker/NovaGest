import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../core/services/translation.service';
import { SupportedLang } from '../../../core/i18n/translations';

@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="lang-switcher-pill"
      [class.compact]="compact"
      role="group"
      aria-label="Selector de idioma / Language selector"
    >
      <button
        type="button"
        class="lang-btn"
        [class.active]="translationService.currentLang() === 'es'"
        (click)="setLang('es')"
        title="Cambiar a Español"
        aria-label="Cambiar idioma a Español"
        [attr.aria-pressed]="translationService.currentLang() === 'es'"
      >
        <span class="flag-icon" aria-hidden="true">🇪🇸</span>
        <span class="lang-code">ES</span>
      </button>

      <button
        type="button"
        class="lang-btn"
        [class.active]="translationService.currentLang() === 'en'"
        (click)="setLang('en')"
        title="Switch to English"
        aria-label="Switch language to English"
        [attr.aria-pressed]="translationService.currentLang() === 'en'"
      >
        <span class="flag-icon" aria-hidden="true">🇬🇧</span>
        <span class="lang-code">EN</span>
      </button>
    </div>
  `,
  styleUrls: ['./lang-switcher.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LangSwitcherComponent {
  public translationService = inject(TranslationService);

  @Input() public compact = false;

  public setLang(lang: SupportedLang): void {
    this.translationService.setLanguage(lang);
  }
}
