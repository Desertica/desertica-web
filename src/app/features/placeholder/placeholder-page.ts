import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';

type PlaceholderData = {
  titleKey?: string;
  leadKey?: string;
};

@Component({
  selector: 'app-placeholder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 class="font-heading text-4xl">{{ titleKey() | translate: i18n.locale() }}</h1>
      <p class="text-muted-foreground mt-4">{{ leadKey() | translate: i18n.locale() }}</p>
    </section>
  `,
})
export class PlaceholderPage {
  private readonly data = toSignal(inject(ActivatedRoute).data, {
    initialValue: {} as PlaceholderData,
  });
  protected readonly i18n = inject(I18nService);
  protected readonly titleKey = computed(() => this.data().titleKey ?? '');
  protected readonly leadKey = computed(() => this.data().leadKey ?? '');
}
