import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n';

/**
 * The one line at the top of a form that explains the mark: required fields carry a terracotta
 * `*` after their label and everything else is optional (docs/ESTANDAR-VISUAL.md §6).
 */
@Component({
  selector: 'app-required-note',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="text-muted-foreground text-sm">{{ parts()[0] }}<span class="text-tierra">*</span>{{ parts()[1] }}</p>`,
})
export class RequiredNote {
  private readonly i18n = inject(I18nService);
  protected readonly parts = computed(() => {
    const [before = '', ...rest] = this.i18n.t('forms.requiredNote').split('*');
    return [before, rest.join('*')];
  });
}
