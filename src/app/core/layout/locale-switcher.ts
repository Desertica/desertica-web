import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { LOCALES, type AppLocale } from '../i18n/catalogs';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';

/** Two pressed-state buttons, ES | EN; the one already active does nothing. */
@Component({
  selector: 'app-locale-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmToggleGroupImports, TranslatePipe],
  host: { class: 'contents' },
  template: `
    <hlm-toggle-group
      class="shrink-0"
      type="single"
      variant="outline"
      [size]="size()"
      [nullable]="false"
      [value]="i18n.locale()"
      (valueChange)="setLocale($event)"
      [attr.aria-label]="'a11y.chooseLanguage' | translate: i18n.locale()"
    >
      @for (locale of locales; track locale) {
        <button
          hlmToggleGroupItem
          type="button"
          [value]="locale"
          class="font-semibold tracking-wide aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground data-[state=on]:bg-primary lg:max-xl:h-7 lg:max-xl:min-w-7 lg:max-xl:text-xs lg:max-xl:tracking-normal lg:max-xl:group-data-[spacing=0]/toggle-group:px-1"
          [aria-label]="'lang.' + locale | translate: i18n.locale()"
        >
          {{ locale.toUpperCase() }}
        </button>
      }
    </hlm-toggle-group>
  `,
})
export class LocaleSwitcher {
  protected readonly i18n = inject(I18nService);
  // Spanish first, as the site is Peruvian.
  protected readonly locales = [...LOCALES].reverse();
  /** `sm` in the header row, `lg` in the mobile menu. */
  readonly size = input<'sm' | 'lg'>('sm');

  protected setLocale(locale: AppLocale | AppLocale[] | null | undefined): void {
    if (typeof locale === 'string' && locale !== this.i18n.locale())
      this.i18n.switchLanguage(locale);
  }
}
