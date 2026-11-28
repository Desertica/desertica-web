import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n';

/** The one cancellation summary of the site (same words as the legal policy), with a link to the full text. */
@Component({
  selector: 'app-cancellation-note',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `<p class="text-muted-foreground text-sm">
    {{ sentence().before
    }}<a routerLink="/cancellation" target="_blank" class="underline underline-offset-4 focus-visible:underline">{{ sentence().link }}</a
    >{{ sentence().after }}
  </p>`,
})
export class CancellationNote {
  protected readonly i18n = inject(I18nService);
  protected readonly sentence = computed(() => {
    const [before = '', link = '', after = ''] = this.i18n.t('booking.cancellationShort').split(/\[|\]/);
    return { before, link, after };
  });
}
