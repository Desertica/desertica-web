import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { LOCALES, type AppLocale } from '../i18n/catalogs';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';

@Component({
  selector: 'app-locale-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmDropdownMenuImports, TranslatePipe],
  template: `
    <button
      hlmBtn
      type="button"
      variant="ghost"
      class="shrink-0 px-2.5 font-medium tracking-wide uppercase"
      [hlmDropdownMenuTrigger]="languageMenu"
      [attr.aria-label]="'a11y.chooseLanguage' | translate: i18n.locale()"
    >
      {{ i18n.locale().toUpperCase() }}
    </button>
    <ng-template #languageMenu>
      <div hlmDropdownMenu>
        @for (locale of locales; track locale) {
          <button type="button" hlmDropdownMenuItem (triggered)="setLocale(locale)">
            {{ 'lang.' + locale | translate: i18n.locale() }}
          </button>
        }
      </div>
    </ng-template>
  `,
})
export class LocaleSwitcher {
  protected readonly i18n = inject(I18nService);
  protected readonly locales = LOCALES;

  protected setLocale(locale: AppLocale): void {
    this.i18n.setLocale(locale);
  }
}
