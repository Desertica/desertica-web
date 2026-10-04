import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCalendar } from '@spartan-ng/helm/calendar';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { asCurrency } from '../../core/analytics/analytics';
import {
  type AvailableDeparture,
  BookingApi,
  type Currency,
  type Quote,
  type TourFormat,
} from '../../core/api/booking-api';
import { BookingFlow } from '../../core/booking/booking-flow';
import { limaDay, limaTime, localDayKey, monthKey, formatMoney } from '../../core/booking/format';
import { CatalogService } from '../../core/catalog/catalog';
import type { TourPage } from '../../core/catalog/tour-pages';
import type { CatalogTour } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';

const CURRENCIES: readonly Currency[] = ['USD', 'PEN'];

/**
 * Online booking on the tour page (shown instead of the WhatsApp form while the booking engine is
 * on): availability and prices per currency, a quote for the group, and the seat hold that starts
 * the checkout.
 */
@Component({
  selector: 'app-booking-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    HlmButton,
    HlmCalendar,
    HlmCardImports,
    HlmFieldImports,
    HlmSkeleton,
    HlmToggleGroupImports,
  ],
  host: { class: 'block w-full' },
  template: `
    <section hlmCard>
      <div hlmCardHeader>
        <h2 class="font-heading text-2xl tracking-wide">
          {{ 'booking.title' | translate: i18n.locale() }}
        </h2>
        <p class="text-muted-foreground text-sm">
          {{ 'booking.lead' | translate: i18n.locale() }}
        </p>
      </div>
      <div hlmCardContent class="flex flex-col gap-6">
        <div hlmField>
          <span hlmFieldLabel id="booking-currency-label">{{
            'booking.currency' | translate: i18n.locale()
          }}</span>
          <hlm-toggle-group
            type="single"
            variant="outline"
            [value]="currency()"
            (valueChange)="onCurrency($event)"
            aria-labelledby="booking-currency-label"
          >
            @for (code of currencies; track code) {
              <button hlmToggleGroupItem type="button" [value]="code">{{ code }}</button>
            }
          </hlm-toggle-group>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div hlmField [class.col-span-2]="!showFormat()">
            <span hlmFieldLabel id="booking-language-label">{{
              'tour.language' | translate: i18n.locale()
            }}</span>
            <hlm-toggle-group
              type="single"
              variant="outline"
              [value]="language()"
              (valueChange)="onLanguage($event)"
              aria-labelledby="booking-language-label"
            >
              @for (code of languages(); track code) {
                <button hlmToggleGroupItem type="button" [value]="code">
                  {{ 'lang.' + code | translate: i18n.locale() }}
                </button>
              }
            </hlm-toggle-group>
          </div>
          @if (showFormat()) {
            <div hlmField>
              <span hlmFieldLabel id="booking-format-label">{{
                'tour.format' | translate: i18n.locale()
              }}</span>
              <hlm-toggle-group
                type="single"
                variant="outline"
                [value]="format()"
                (valueChange)="onFormat($event)"
                aria-labelledby="booking-format-label"
              >
                <button hlmToggleGroupItem type="button" value="SHARED">
                  {{ 'tour.shared' | translate: i18n.locale() }}
                </button>
                <button hlmToggleGroupItem type="button" value="PRIVATE">
                  {{ 'tour.private' | translate: i18n.locale() }}
                </button>
              </hlm-toggle-group>
            </div>
          }
        </div>

        <div hlmField>
          <span hlmFieldLabel>{{ 'tour.date' | translate: i18n.locale() }}</span>
          @if (loading()) {
            <hlm-skeleton class="h-64 w-full" />
            <p class="text-muted-foreground text-sm" role="status">
              {{ 'booking.loading' | translate: i18n.locale() }}
            </p>
          } @else if (loadFailed()) {
            <p class="text-destructive text-sm" role="alert">
              {{ 'booking.loadError' | translate: i18n.locale() }}
            </p>
            <button hlmBtn type="button" variant="outline" (click)="reload()">
              {{ 'booking.retry' | translate: i18n.locale() }}
            </button>
          } @else {
            <hlm-calendar
              [date]="date()"
              (dateChange)="onDate($event)"
              [min]="today"
              [max]="lastDay()"
              [dateDisabled]="isUnavailable"
            />
            @if (!hasAvailability()) {
              <p class="text-muted-foreground text-sm" role="status">
                {{ 'booking.noAvailability' | translate: i18n.locale() }}
              </p>
            }
          }
        </div>

        @if (dayDepartures().length) {
          <div hlmField>
            <span hlmFieldLabel id="booking-time-label">{{
              'booking.departures' | translate: i18n.locale()
            }}</span>
            <hlm-toggle-group
              type="single"
              variant="outline"
              class="flex-wrap"
              [value]="departureId() ?? ''"
              (valueChange)="onDeparture($event)"
              aria-labelledby="booking-time-label"
            >
              @for (departure of dayDepartures(); track departure.departureId) {
                <button hlmToggleGroupItem type="button" [value]="departure.departureId">
                  {{ time(departure) }} · {{ priceLabel(departure) }}
                </button>
              }
            </hlm-toggle-group>
            @if (departure(); as chosen) {
              <p class="text-muted-foreground text-sm">
                {{ seatsLabel(chosen) }}
                @if (chosen.meetingPoint) {
                  · {{ chosen.meetingPoint }}
                }
              </p>
            }
          </div>

          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between gap-3">
              <span>{{ 'tour.adultsAge' | translate: i18n.locale() }}</span>
              <div class="flex items-center gap-2">
                <button type="button" hlmBtn size="icon-sm" variant="outline" [disabled]="adults() <= rules.adultsMin" (click)="bump('adults', -1)" [attr.aria-label]="'booking.fewer' | translate: i18n.locale()">−</button>
                <span class="w-6 text-center tabular-nums" id="booking-adults">{{ adults() }}</span>
                <button type="button" hlmBtn size="icon-sm" variant="outline" [disabled]="!canAdd()" (click)="bump('adults', 1)" [attr.aria-label]="'booking.more' | translate: i18n.locale()">+</button>
              </div>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span>{{ 'tour.childrenAge' | translate: i18n.locale() }}</span>
              <div class="flex items-center gap-2">
                <button type="button" hlmBtn size="icon-sm" variant="outline" [disabled]="children() <= rules.childrenMin" (click)="bump('children', -1)" [attr.aria-label]="'booking.fewer' | translate: i18n.locale()">−</button>
                <span class="w-6 text-center tabular-nums" id="booking-children">{{ children() }}</span>
                <button type="button" hlmBtn size="icon-sm" variant="outline" [disabled]="!canAdd()" (click)="bump('children', 1)" [attr.aria-label]="'booking.more' | translate: i18n.locale()">+</button>
              </div>
            </div>
          </div>
        }

        @if (quote(); as current) {
          <dl class="border-border flex flex-col gap-2 rounded-3xl border p-4 text-sm" id="booking-quote">
            @for (line of current.lines; track line.label) {
              <div class="flex justify-between gap-3">
                <dt>{{ line.quantity }} × {{ line.label }}</dt>
                <dd class="tabular-nums">{{ money(line.totalCents, current.currency) }}</dd>
              </div>
            }
            <div class="flex justify-between gap-3 font-medium">
              <dt>{{ 'booking.total' | translate: i18n.locale() }}</dt>
              <dd class="tabular-nums" id="booking-total">{{ money(current.totalCents, current.currency) }}</dd>
            </div>
            <div class="text-muted-foreground flex justify-between gap-3">
              <dt>{{ 'booking.deposit' | translate: i18n.locale() }}</dt>
              <dd class="tabular-nums">{{ money(current.depositCents, current.currency) }}</dd>
            </div>
            <p class="text-muted-foreground text-xs">{{ 'booking.taxIncluded' | translate: i18n.locale() }}</p>
          </dl>
        } @else if (quoting()) {
          <hlm-skeleton class="h-24 w-full" />
        } @else if (quoteFailed()) {
          <p class="text-destructive text-sm" role="alert">
            {{ 'booking.quoteError' | translate: i18n.locale() }}
          </p>
        }

        @if (reserveError(); as key) {
          <p class="text-destructive text-sm" role="alert" id="booking-error">
            {{ key | translate: i18n.locale() }}
          </p>
        }

        <button
          hlmBtn
          type="button"
          class="w-full"
          id="booking-continue"
          [disabled]="!quote() || holding()"
          (click)="reserve()"
        >
          {{ (holding() ? 'booking.holding' : 'booking.continue') | translate: i18n.locale() }}
        </button>
        <p class="text-muted-foreground text-xs">{{ 'booking.holdNote' | translate: i18n.locale() }}</p>
      </div>
    </section>
  `,
})
export class BookingPanel {
  private readonly api = inject(BookingApi);
  private readonly flow = inject(BookingFlow);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private availabilityRun = 0;
  private quoteRun = 0;

  readonly tour = input.required<CatalogTour>();
  readonly page = input.required<TourPage>();

  protected readonly i18n = inject(I18nService);
  protected readonly rules = this.catalog.booking();
  protected readonly currencies = CURRENCIES;
  protected readonly today = new Date();

  protected readonly currency = signal<Currency>(asCurrency(this.rules.currencyCode));
  protected readonly format = signal<TourFormat>('SHARED');
  protected readonly language = signal<string>('es');
  protected readonly adults = signal(this.rules.adultsDefault);
  protected readonly children = signal(this.rules.childrenDefault);
  protected readonly date = signal<Date | undefined>(undefined);
  protected readonly departureId = signal<string | null>(null);

  protected readonly departures = signal<readonly AvailableDeparture[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly quote = signal<Quote | null>(null);
  protected readonly quoting = signal(false);
  protected readonly quoteFailed = signal(false);
  protected readonly holding = signal(false);
  protected readonly reserveError = signal<string | null>(null);

  protected readonly languages = computed(() => (this.page().languages.length ? this.page().languages : ['es', 'en']));
  protected readonly showFormat = computed(() => this.page().format === 'both');
  private readonly byDay = computed(() => {
    const days = new Map<string, AvailableDeparture[]>();
    for (const departure of this.departures()) {
      const key = limaDay(departure.startsAt);
      days.set(key, [...(days.get(key) ?? []), departure]);
    }

    return days;
  });
  protected readonly hasAvailability = computed(() => this.byDay().size > 0);
  protected readonly dayDepartures = computed(() => {
    const date = this.date();
    return date ? (this.byDay().get(localDayKey(date)) ?? []) : [];
  });
  protected readonly departure = computed(
    () => this.departures().find((item) => item.departureId === this.departureId()) ?? null,
  );
  protected readonly lastDay = computed(() => {
    const last = new Date(this.today.getFullYear(), this.today.getMonth() + this.rules.availabilityMonths, 0);
    return last;
  });
  protected readonly canAdd = computed(() => {
    const party = this.adults() + this.children();
    const seats = this.departure()?.seatsLeft ?? this.rules.peopleMax;
    return party < Math.min(this.rules.peopleMax, seats);
  });

  protected readonly isUnavailable = (date: Date): boolean => !this.byDay().has(localDayKey(date));

  constructor() {
    const page = this.page;
    effect(() => {
      const locale = this.i18n.locale();
      const options = page().languages;
      untracked(() => {
        this.language.set(options.includes(locale) ? locale : (options[0] ?? 'es'));
        this.format.set(page().format === 'private' ? 'PRIVATE' : 'SHARED');
      });
    });

    effect(() => {
      // Availability depends on the tour, currency, format and language.
      const slug = this.tour().id;
      const currency = this.currency();
      const format = this.format();
      const language = this.language();
      untracked(() => void this.loadAvailability(slug, currency, format, language));
    });

    effect(() => {
      const departure = this.departure();
      const adults = this.adults();
      const children = this.children();
      const currency = this.currency();
      untracked(() => void this.loadQuote(departure, adults, children, currency));
    });
  }

  protected reload(): void {
    void this.loadAvailability(this.tour().id, this.currency(), this.format(), this.language());
  }

  protected onCurrency(value: unknown): void {
    if (value === 'USD' || value === 'PEN') {
      this.currency.set(value);
    }
  }

  protected onLanguage(value: unknown): void {
    if (typeof value === 'string' && value) {
      this.language.set(value);
    }
  }

  protected onFormat(value: unknown): void {
    if (value === 'SHARED' || value === 'PRIVATE') {
      this.format.set(value);
    }
  }

  protected onDate(value: Date | undefined): void {
    this.date.set(value);
    this.reserveError.set(null);
    const options = value ? (this.byDay().get(localDayKey(value)) ?? []) : [];
    this.departureId.set(options.length === 1 ? (options[0]?.departureId ?? null) : null);
  }

  protected onDeparture(value: unknown): void {
    this.departureId.set(typeof value === 'string' && value ? value : null);
    this.reserveError.set(null);
  }

  protected bump(kind: 'adults' | 'children', delta: 1 | -1): void {
    const target = kind === 'adults' ? this.adults : this.children;
    const minimum = kind === 'adults' ? this.rules.adultsMin : this.rules.childrenMin;
    const next = target() + delta;
    if (next < minimum || (delta > 0 && !this.canAdd())) {
      return;
    }

    target.set(next);
  }

  protected time(departure: AvailableDeparture): string {
    return limaTime(departure.startsAt, this.i18n.locale());
  }

  protected money(cents: number, currency: string): string {
    return formatMoney(cents, currency, this.i18n.locale());
  }

  protected priceLabel(departure: AvailableDeparture): string {
    const price = departure.price;
    const suffix = price.unit === 'PER_GROUP' ? 'booking.perGroup' : 'booking.perPerson';
    const amount = price.unit === 'PER_GROUP' ? (price.groupCents ?? price.adultCents) : price.adultCents;
    return `${this.money(amount, price.currency)} ${this.i18n.t(suffix)}`;
  }

  protected seatsLabel(departure: AvailableDeparture): string {
    return this.i18n.t('booking.seatsLeft').replace('{count}', String(departure.seatsLeft));
  }

  protected async reserve(): Promise<void> {
    const departure = this.departure();
    const quote = this.quote();
    if (!departure || !quote || this.holding()) {
      return;
    }

    this.holding.set(true);
    this.reserveError.set(null);
    const result = await this.flow.reserve({
      tourSlug: this.tour().id,
      departureId: departure.departureId,
      startsAt: departure.startsAt,
      meetingPoint: departure.meetingPoint ?? null,
      currency: this.currency(),
      format: departure.format,
      language: departure.language,
      adults: this.adults(),
      children: this.children(),
      quote,
    });
    this.holding.set(false);

    if (!result.ok) {
      this.reserveError.set(
        result.status === 409
          ? 'booking.errorSeats'
          : result.status === 429
            ? 'booking.errorBusy'
            : 'booking.errorGeneric',
      );
      if (result.status === 409) {
        this.reload();
      }

      return;
    }

    await this.router.navigateByUrl('/checkout');
  }

  private async loadAvailability(
    slug: string,
    currency: Currency,
    format: TourFormat,
    language: string,
  ): Promise<void> {
    if (!this.browser) {
      return;
    }

    const run = ++this.availabilityRun;
    this.loading.set(true);
    this.loadFailed.set(false);
    const now = new Date();
    const results = await Promise.all(
      Array.from({ length: this.rules.availabilityMonths }, (_, offset) =>
        this.api.availability(slug, {
          month: monthKey(now, offset),
          currency,
          language,
          format,
        }),
      ),
    );
    if (run !== this.availabilityRun) {
      return;
    }

    this.loading.set(false);
    if (results.every((result) => !result.ok)) {
      this.loadFailed.set(true);
      this.departures.set([]);
      return;
    }

    const found = results.flatMap((result) => (result.ok ? result.data.data : []));
    this.departures.set(found);
    const selected = this.departureId();
    if (selected && !found.some((item) => item.departureId === selected)) {
      this.departureId.set(null);
      this.date.set(undefined);
    }
  }

  private async loadQuote(
    departure: AvailableDeparture | null,
    adults: number,
    children: number,
    currency: Currency,
  ): Promise<void> {
    const run = ++this.quoteRun;
    this.quote.set(null);
    this.quoteFailed.set(false);
    if (!this.browser || !departure || departure.price.currency !== currency) {
      this.quoting.set(false);
      return;
    }

    this.quoting.set(true);
    const result = await this.api.quote({ departureId: departure.departureId, adults, children, currency });
    if (run !== this.quoteRun) {
      return;
    }

    this.quoting.set(false);
    if (result.ok) {
      this.quote.set(result.data);
    } else {
      this.quoteFailed.set(true);
    }
  }
}
