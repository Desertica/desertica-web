import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import {
  BookingApi,
  type PayTarget,
  type PaymentLinkInfo,
  type PaymentOption,
} from '../../core/api/booking-api';
import { formatMoney, limaDateLong, limaTime } from '../../core/booking/format';
import { CatalogService } from '../../core/catalog/catalog';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';
import { PaymentStep } from './payment-step';

type Load = 'loading' | 'ready' | 'gone' | 'missing' | 'error';

/**
 * Payment link from an e-mail (`/pay/:token`). The link fixes the kind and the amount; the visitor
 * only picks a gateway. There is no booking token here, so after paying the page cannot read the
 * booking back: it says the payment is being confirmed and the API sends the confirmation e-mail.
 */
@Component({
  selector: 'app-pay-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, HlmButton, HlmCardImports, PaymentStep],
  template: `
    <section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 class="font-heading text-3xl">{{ 'payment.title' | translate: i18n.locale() }}</h1>

      @switch (load()) {
        @case ('loading') {
          <p role="status">{{ 'payment.linkLoading' | translate: i18n.locale() }}</p>
        }
        @case ('missing') {
          <p role="alert" id="pay-missing">{{ 'payment.linkMissing' | translate: i18n.locale() }}</p>
        }
        @case ('gone') {
          <p role="alert" id="pay-gone">{{ 'payment.linkGone' | translate: i18n.locale() }}</p>
          <a hlmBtn routerLink="/booking" class="w-fit">{{ 'myBooking.title' | translate: i18n.locale() }}</a>
        }
        @case ('error') {
          <p class="text-destructive" role="alert">{{ 'payment.linkError' | translate: i18n.locale() }}</p>
        }
        @default {
          @if (info(); as current) {
            <section hlmCard>
              <div hlmCardContent class="flex flex-col gap-2 text-sm">
                <p>
                  {{ 'myBooking.reference' | translate: i18n.locale() }}:
                  <strong id="pay-reference">{{ current.reference }}</strong>
                </p>
                @if (tourTitle()) {
                  <p>{{ tourTitle() }}</p>
                }
                @if (when()) {
                  <p>{{ when() }}</p>
                }
                <p class="font-medium">
                  {{ 'payment.kind.' + current.kind | translate: i18n.locale() }}:
                  <span id="pay-amount">{{ money(current.amountCents) }}</span>
                </p>
              </div>
            </section>

            <app-payment-step
              [target]="target()"
              [currency]="current.currency"
              [options]="options()"
              [amounts]="amounts()"
              [reference]="current.reference"
            />
          }
        }
      }
    </section>
  `,
})
export class PayLink {
  private readonly api = inject(BookingApi);
  private readonly catalog = inject(CatalogService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Payment link token from the e-mailed path. */
  readonly token = input.required<string>();
  protected readonly i18n = inject(I18nService);
  protected readonly load = signal<Load>('loading');
  protected readonly info = signal<PaymentLinkInfo | null>(null);

  protected readonly target = computed<PayTarget>(() => ({ type: 'link', token: this.token() }));
  /** The link names the gateways; the kind is the one the link was issued for. */
  protected readonly options = computed<PaymentOption[]>(() => {
    const info = this.info();
    return info ? info.paymentOptions.map((provider) => ({ provider, kinds: [info.kind] })) : [];
  });
  protected readonly amounts = computed(() => {
    const info = this.info();
    return info ? { [info.kind]: info.amountCents } : {};
  });
  protected readonly tourTitle = computed(() => {
    const slug = this.info()?.tourSlug;
    const tour = slug ? this.catalog.tourById(slug) : undefined;
    return tour ? this.i18n.t(tour.titleKey) : '';
  });
  protected readonly when = computed(() => {
    const at = this.info()?.startsAt;
    return at ? `${limaDateLong(at, this.i18n.locale())} · ${limaTime(at, this.i18n.locale())}` : '';
  });

  constructor() {
    usePageMeta(() => ({ title: this.i18n.t('payment.title'), noindex: true }));
    afterNextRender(() => void this.init());
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.info()?.currency ?? 'USD', this.i18n.locale());
  }

  private async init(): Promise<void> {
    if (!this.browser) {
      return;
    }

    const result = await this.api.paymentLink(this.token());
    if (!result.ok) {
      this.load.set(result.status === 404 ? 'missing' : result.status === 410 ? 'gone' : 'error');
      return;
    }

    this.info.set(result.data);
    this.load.set('ready');
  }
}
