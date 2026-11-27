import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { LOCALES, type AppLocale } from '../i18n/catalogs';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';

/** Text-only toggle item, shared with the currency selector: as quiet as the nav links, so the CTA stays the only green thing in the header; the chosen one is marked in the `tierra` accent with a short bar under it. */
export const SWITCH_ITEM_CLASS =
  'relative h-10 min-w-0 gap-1 rounded-md bg-transparent px-1.5 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-transparent aria-pressed:font-semibold aria-pressed:text-tierra aria-pressed:hover:text-tierra data-[state=on]:bg-transparent after:absolute after:inset-x-1.5 after:bottom-2 after:h-0.5 after:rounded-full after:bg-tierra after:opacity-0 aria-pressed:after:opacity-100 lg:max-xl:h-9 lg:max-xl:px-1 lg:max-xl:text-xs lg:max-xl:after:inset-x-1 data-[size=lg]:h-11 data-[size=lg]:px-2 data-[size=lg]:text-base data-[size=lg]:after:inset-x-2';

/** Two pressed-state buttons, ES / EN; the one already active does nothing. In the mobile menu (`lg`) it gets a visible label. */
@Component({
  selector: 'app-locale-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmToggleGroupImports, TranslatePipe],
  host: { class: 'contents' },
  template: `
    @if (size() === 'lg') {
      <span class="text-muted-foreground w-20 text-sm" aria-hidden="true">{{
        'a11y.chooseLanguage' | translate: i18n.locale()
      }}</span>
    }
    <hlm-toggle-group
      class="shrink-0 lg:max-xl:gap-0"
      type="single"
      spacing="1"
      [size]="size()"
      [nullable]="false"
      [value]="i18n.locale()"
      (valueChange)="setLocale($event)"
      [attr.aria-label]="'a11y.chooseLanguage' | translate: i18n.locale()"
    >
      @for (locale of locales; track locale; let first = $first) {
        @if (!first) {
          <span class="text-muted-foreground/50 select-none" aria-hidden="true">/</span>
        }
        <button
          hlmToggleGroupItem
          type="button"
          [value]="locale"
          [class]="itemClass"
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
  protected readonly itemClass = SWITCH_ITEM_CLASS;
  /** `sm` in the header row, `lg` in the mobile menu. */
  readonly size = input<'sm' | 'lg'>('sm');

  protected setLocale(locale: AppLocale | AppLocale[] | null | undefined): void {
    if (typeof locale === 'string' && locale !== this.i18n.locale())
      this.i18n.switchLanguage(locale);
  }
}
