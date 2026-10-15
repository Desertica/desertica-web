import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInput } from '@spartan-ng/helm/input';
import { PurchaseTracker } from '../../core/analytics/purchase';
import { BookingApi, type PublicBooking } from '../../core/api/booking-api';
import { BookingFlow } from '../../core/booking/booking-flow';
import { formatMoney, limaDateLong, limaTime } from '../../core/booking/format';
import { CatalogService } from '../../core/catalog/catalog';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';

/**
 * Confirmation and "my booking". The e-mailed link carries `?token=`, which is moved into
 * sessionStorage and removed from the address bar; without a token the visitor asks for a new link
 * with the booking reference and e-mail. The payment options come from the booking itself, so
 * "Pay now" survives a reload. A confirmed booking publishes `purchase` through `PurchaseTracker`.
 */
@Component({
  selector: 'app-my-booking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, HlmButton, HlmCardImports, HlmFieldImports, HlmInput],
  template: `
    <section class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 class="font-heading text-3xl">{{ 'myBooking.title' | translate: i18n.locale() }}</h1>

      @if (booking(); as current) {
        <section hlmCard>
          <div hlmCardContent class="flex flex-col gap-3 text-sm">
            <p>
              {{ 'myBooking.reference' | translate: i18n.locale() }}:
              <strong id="booking-reference">{{ current.reference }}</strong>
            </p>
            <p id="booking-status" class="font-medium">
              {{ 'myBooking.status.' + current.status | translate: i18n.locale() }}
            </p>
            <p>{{ tourTitle() }}</p>
            <p>{{ date() }} · {{ time() }}</p>
            @if (current.meetingPoint) {
              <p class="text-muted-foreground">{{ 'myBooking.meeting' | translate: i18n.locale() }}: {{ current.meetingPoint }}</p>
            }
            <p class="text-muted-foreground" id="booking-format">{{ 'myBooking.format.' + current.format | translate: i18n.locale() }}</p>
            <p>
              {{ current.adults ?? 0 }} {{ 'tour.adults' | translate: i18n.locale() }}
              @if (current.children) {
                · {{ current.children }} {{ 'tour.children' | translate: i18n.locale() }}
              }
            </p>
            @if (current.passengers?.length) {
              <p class="text-muted-foreground">
                {{ 'myBooking.passengers' | translate: i18n.locale() }}: {{ passengerNames() }}
              </p>
            }
            <dl class="border-border flex flex-col gap-1 rounded-3xl border p-4">
              <div class="flex justify-between"><dt>{{ 'booking.total' | translate: i18n.locale() }}</dt><dd>{{ money(current.totalCents) }}</dd></div>
              <div class="flex justify-between"><dt>{{ 'myBooking.paid' | translate: i18n.locale() }}</dt><dd id="booking-paid">{{ money(current.paidCents) }}</dd></div>
              <div class="flex justify-between font-medium"><dt>{{ 'myBooking.pending' | translate: i18n.locale() }}</dt><dd>{{ money(current.pendingCents) }}</dd></div>
            </dl>
            @if (current.status === 'PENDING_PAYMENT' && canPay()) {
              <a hlmBtn class="w-fit" [routerLink]="['/checkout/payment', current.reference]">{{ 'myBooking.pay' | translate: i18n.locale() }}</a>
            }
          </div>
        </section>

        @if (current.cancellationTiers?.length) {
          <section class="flex flex-col gap-2">
            <h2 class="font-heading text-xl">{{ 'myBooking.cancellation' | translate: i18n.locale() }}</h2>
            <ul class="text-muted-foreground list-disc ps-5 text-sm">
              @for (tier of current.cancellationTiers; track tier.hoursBefore) {
                <li>{{ tierLabel(tier.hoursBefore ?? 0, tier.refundPercent ?? 0) }}</li>
              }
            </ul>
          </section>
        }

        @if (current.waivers?.length) {
          <section class="flex flex-col gap-2">
            <h2 class="font-heading text-xl">{{ 'myBooking.waivers' | translate: i18n.locale() }}</h2>
            <ul class="text-sm">
              @for (waiver of current.waivers; track waiver.token) {
                <li class="flex flex-wrap items-center gap-x-3">
                  <span>{{ waiver.passengerName ?? '—' }} · {{ 'myBooking.waiver.' + waiver.status | translate: i18n.locale() }}</span>
                  @if (waiver.status === 'PENDING' && waiver.token) {
                    <a class="underline underline-offset-4" [routerLink]="['/waiver', waiver.token]">{{ 'myBooking.signWaiver' | translate: i18n.locale() }}</a>
                  }
                </li>
              }
            </ul>
          </section>
        }

        @if (current.documents?.length) {
          <section class="flex flex-col gap-2">
            <h2 class="font-heading text-xl">{{ 'myBooking.documents' | translate: i18n.locale() }}</h2>
            <ul class="text-sm">
              @for (document of current.documents; track document.number) {
                <li><a [href]="document.pdfUrl" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4">{{ document.number }}</a></li>
              }
            </ul>
          </section>
        }
      } @else if (loading()) {
        <p role="status">{{ 'myBooking.loading' | translate: i18n.locale() }}</p>
      } @else {
        <p class="text-muted-foreground">{{ 'myBooking.lead' | translate: i18n.locale() }}</p>
        @if (denied()) {
          <p class="text-destructive" role="alert" id="booking-denied">{{ 'myBooking.denied' | translate: i18n.locale() }}</p>
        }
        @if (loadFailed()) {
          <p class="text-destructive" role="alert">{{ 'myBooking.loadError' | translate: i18n.locale() }}</p>
        }
        @if (sent()) {
          <p role="status" id="booking-sent">{{ 'myBooking.sent' | translate: i18n.locale() }}</p>
        } @else {
          <form class="flex flex-col gap-4" [formGroup]="access" (ngSubmit)="requestAccess()" novalidate>
            <div hlmField>
              <label hlmFieldLabel for="access-reference">{{ 'myBooking.reference' | translate: i18n.locale() }}</label>
              <input hlmInput id="access-reference" formControlName="reference" maxlength="64" autocomplete="off" />
              @if (touched(access.controls.reference)) {
                <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
              }
            </div>
            <div hlmField>
              <label hlmFieldLabel for="access-email">{{ 'checkout.email' | translate: i18n.locale() }}</label>
              <input hlmInput id="access-email" type="email" formControlName="email" autocomplete="email" maxlength="254" />
              @if (touched(access.controls.email)) {
                <hlm-field-error [forceShow]="true">{{ 'checkout.errorEmail' | translate: i18n.locale() }}</hlm-field-error>
              }
            </div>
            @if (accessError()) {
              <p class="text-destructive text-sm" role="alert">{{ 'checkout.errorGeneric' | translate: i18n.locale() }}</p>
            }
            <button hlmBtn type="submit" id="access-submit" class="w-fit" [disabled]="sending()">
              {{ 'myBooking.sendLink' | translate: i18n.locale() }}
            </button>
          </form>
        }
      }
    </section>
  `,
})
export class MyBooking {
  private readonly api = inject(BookingApi);
  private readonly flow = inject(BookingFlow);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly purchases = inject(PurchaseTracker);
  private readonly catalog = inject(CatalogService);

  /** Booking reference from the path; absent on `/booking`. */
  readonly reference = input<string>();
  protected readonly i18n = inject(I18nService);
  protected readonly booking = signal<PublicBooking | null>(null);
  protected readonly loading = signal(false);
  protected readonly denied = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly sent = signal(false);
  protected readonly sending = signal(false);
  protected readonly accessError = signal(false);
  private readonly attempted = signal(false);
  protected readonly access = new FormGroup({
    reference: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(64)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  protected readonly tourTitle = computed(() => {
    const slug = this.booking()?.tourSlug;
    const tour = slug ? this.catalog.tourById(slug) : undefined;
    return tour ? this.i18n.t(tour.titleKey) : (slug ?? '');
  });
  protected readonly date = computed(() => {
    const at = this.booking()?.startsAt;
    return at ? limaDateLong(at, this.i18n.locale()) : '';
  });
  protected readonly time = computed(() => {
    const at = this.booking()?.startsAt;
    return at ? limaTime(at, this.i18n.locale()) : '';
  });
  protected readonly passengerNames = computed(() =>
    (this.booking()?.passengers ?? []).map((person) => `${person.firstName} ${person.lastName}`).join(', '),
  );
  protected readonly canPay = computed(() => (this.booking()?.paymentOptions.length ?? 0) > 0);

  constructor() {
    usePageMeta(() => ({ title: this.i18n.t('myBooking.title'), noindex: true }));
    afterNextRender(() => void this.init());
  }

  protected touched(control: FormControl): boolean {
    return control.invalid && (control.touched || this.attempted());
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.booking()?.currency ?? 'USD', this.i18n.locale());
  }

  protected tierLabel(hours: number, percent: number): string {
    return this.i18n.t('checkout.tier').replace('{hours}', String(hours)).replace('{percent}', String(percent));
  }

  protected async requestAccess(): Promise<void> {
    this.attempted.set(true);
    this.access.markAllAsTouched();
    if (this.access.invalid || this.sending()) {
      return;
    }

    this.sending.set(true);
    this.accessError.set(false);
    const result = await this.api.requestBookingAccess({
      reference: this.access.controls.reference.value.trim(),
      email: this.access.controls.email.value.trim(),
    });
    this.sending.set(false);
    // The API answers the same whether or not the reference exists, so the screen does too.
    if (result.ok) {
      this.sent.set(true);
    } else {
      this.accessError.set(true);
    }
  }

  private async init(): Promise<void> {
    const reference = this.reference();
    if (reference) {
      this.access.controls.reference.setValue(reference);
    }

    const emailed = this.route.snapshot.queryParamMap.get('token');
    if (reference && emailed) {
      this.flow.remember(reference, { accessToken: emailed });
      await this.router.navigate([], { queryParams: { token: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }

    const token = reference ? this.flow.remembered(reference)?.accessToken : undefined;
    if (!reference || !token) {
      return;
    }

    this.loading.set(true);
    const result = await this.api.booking(reference, token);
    this.loading.set(false);
    if (!result.ok) {
      if (result.status === 401 || result.status === 404) {
        this.denied.set(true);
      } else {
        this.loadFailed.set(true);
      }

      return;
    }

    this.booking.set(result.data);
    this.purchases.record(result.data);
  }
}
