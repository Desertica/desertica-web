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
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCalendar } from '@spartan-ng/helm/calendar';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import {
  type AvailableDeparture,
  BookingApi,
  type Currency,
  type Quote,
  type TourFormat,
} from '../../core/api/booking-api';
import { CurrencyService } from '../../core/currency/currency';
import { CartService } from '../../core/booking/cart';
import { formatPickerDate } from '../tours/detail/tour-whatsapp';
import { Turnstile } from '../../core/forms/turnstile';
import { BookingFlow, holdErrorKey, type BookingSelection } from '../../core/booking/booking-flow';
import { limaDay, limaTime, localDayKey, monthKey, formatMoney } from '../../core/booking/format';
import { CatalogService } from '../../core/catalog/catalog';
import type { TourPage } from '../../core/catalog/tour-pages';
import type { CatalogTour } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';


/**
 * Online booking on the tour page (shown instead of the WhatsApp form while the booking engine is
 * on): availability and prices per currency, a quote for the group, and the seat hold that starts
 * the checkout.
 */
@Component({
  selector: 'app-booking-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    HlmButton,
    HlmCalendar,
    HlmCardImports,
    HlmFieldImports,
    HlmSkeleton,
    HlmToggleGroupImports,
    HlmPopoverImports,
    NgIcon,
    Turnstile,
  ],
  providers: [provideIcons({ lucideChevronDown })],
  host: { class: 'block w-full' },
  template: `
    <section hlmCard>
      <div hlmCardHeader>
        <p id="booking-from" class="font-heading text-2xl tracking-wide uppercase">
          {{ 'gallery.from' | translate: i18n.locale() }} {{ fromLabel() }}
        </p>
      </div>
      <div hlmCardContent class="flex flex-col gap-6">
        <div hlmField>
          <span hlmFieldLabel id="booking-date-label">{{ 'tour.date' | translate: i18n.locale() }}</span>
          @if (loading()) {
            <hlm-skeleton class="h-9 w-full" />
          } @else if (loadFailed()) {
            <p class="text-destructive text-sm" role="alert">
              {{ 'booking.loadError' | translate: i18n.locale() }}
            </p>
            <button hlmBtn type="button" variant="outline" (click)="reload()">
              {{ 'booking.retry' | translate: i18n.locale() }}
            </button>
          } @else {
            <hlm-popover align="start" sideOffset="5">
              <button
                type="button"
                id="booking-date"
                hlmPopoverTrigger
                [class]="selectClass"
                aria-labelledby="booking-date-label"
              >
                <span class="truncate" [class.text-muted-foreground]="!date()">{{ dateLabel() }}</span>
                <ng-icon name="lucideChevronDown" class="text-muted-foreground ms-auto" />
              </button>
              <hlm-popover-content class="w-auto p-2" *hlmPopoverPortal="let ctx">
                <hlm-calendar
                  [date]="date()"
                  (dateChange)="onDate($event); ctx.close()"
                  [min]="today"
                  [max]="lastDay()"
                  [dateDisabled]="isUnavailable"
                />
              </hlm-popover-content>
            </hlm-popover>
            @if (!hasAvailability()) {
              <p class="text-muted-foreground text-sm" role="status">
                {{ 'booking.noAvailability' | translate: i18n.locale() }}
              </p>
            }
          }
        </div>

        @if (dayDepartures().length > 1) {
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
                  {{ time(departure) }}
                </button>
              }
            </hlm-toggle-group>
          </div>
        }
        @if (departure(); as chosen) {
          <p class="text-muted-foreground -mt-3 text-sm">
            {{ time(chosen) }} · {{ seatsLabel(chosen) }}
            @if (chosen.meetingPoint) {
              · {{ chosen.meetingPoint }}
            }
          </p>
        }

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
          <span hlmFieldLabel id="booking-people-label">{{ 'tour.people' | translate: i18n.locale() }}</span>
          <hlm-popover align="start" sideOffset="5">
            <button type="button" id="booking-people" hlmPopoverTrigger [class]="selectClass" aria-labelledby="booking-people-label">
              <span class="truncate">{{ peopleSummary() }}</span>
              <ng-icon name="lucideChevronDown" class="text-muted-foreground ms-auto" />
            </button>
            <hlm-popover-content class="w-80" *hlmPopoverPortal="let ctx">
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
            </hlm-popover-content>
          </hlm-popover>
        </div>

        @if (quote(); as current) {
          <div class="flex flex-col gap-3" id="booking-quote">
            <div [class]="amountClass">
              <span class="text-sm font-medium tracking-wide uppercase">{{ 'tour.payFull' | translate: i18n.locale() }}</span>
              <span id="booking-total">{{ short(current.totalCents, current.currency) }}</span>
            </div>
            <div [class]="amountClass">
              <span class="text-sm font-medium tracking-wide uppercase">{{ 'tour.payLater' | translate: i18n.locale() }}</span>
              <span id="booking-deposit">{{ short(current.depositCents, current.currency) }}</span>
            </div>
            <p class="text-muted-foreground text-xs">{{ 'booking.taxIncluded' | translate: i18n.locale() }}</p>
          </div>
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

        <app-turnstile (tokenChange)="captcha.set($event)" />
        <button
          hlmBtn
          type="button"
          class="w-full"
          id="booking-continue"
          [disabled]="!quote() || holding() || (captchaRequired() && !captcha())"
          (click)="reserve()"
        >
          {{ (holding() ? 'booking.holding' : 'tour.book') | translate: i18n.locale() }}
        </button>
        <button
          hlmBtn
          type="button"
          variant="outline"
          class="w-full"
          id="booking-add"
          [disabled]="!quote()"
          (click)="addToCart()"
        >
          {{ 'cart.add' | translate: i18n.locale() }}
        </button>
        @if (added()) {
          <p class="text-sm" role="status" id="booking-added">
            {{ 'cart.added' | translate: i18n.locale() }}
            <a routerLink="/cart" class="underline underline-offset-2">{{ 'cart.view' | translate: i18n.locale() }}</a>
          </p>
        }
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
  protected readonly today = new Date();

  // The header switcher and this toggle are the same choice.
  private readonly cart = inject(CartService);
  /** Which selection was added; the confirmation disappears as soon as the group, day or departure changes. */
  private readonly addedKey = signal<string | null>(null);
  protected readonly added = computed(() => this.addedKey() !== null && this.addedKey() === this.selectionKey());
  private readonly currencyChoice = inject(CurrencyService);
  protected readonly currency = this.currencyChoice.currency;
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
  /** Same look as the WhatsApp booking form: soft field buttons and amount cards. */
  protected readonly selectClass =
    'bg-input/50 focus-visible:border-ring focus-visible:ring-ring/30 inline-flex h-9 w-full items-center justify-between gap-1.5 rounded-3xl border border-transparent px-3 text-sm font-normal outline-none focus-visible:ring-3';
  protected readonly amountClass = 'bg-input/50 flex w-full flex-col gap-0.5 rounded-3xl px-4 py-3.5';
  /** Lowest adult price among the loaded departures, as on the tour cards (\$USD 45). */
  protected readonly fromLabel = computed(() => {
    const prices = this.departures().map((d) => d.price.adultCents);
    return prices.length ? this.short(Math.min(...prices), this.currency()) : '';
  });
  private readonly turnstile = viewChild(Turnstile);
  /** The API holds seats only with a solved Turnstile challenge when the site key is configured. */
  protected readonly captchaRequired = computed(() => this.turnstile()?.enabled === true);
  protected readonly captcha = signal<string | null>(null);
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

  /** `$USD 45` / `S/PEN 165`, the format of the tour cards and of the WhatsApp form. */
  protected short(cents: number, currency: string): string {
    const amount = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
    return `${currency === 'PEN' ? 'S/PEN' : '$USD'} ${amount}`;
  }

  protected dateLabel(): string {
    const date = this.date();
    return date ? formatPickerDate(date) : this.i18n.t('tour.date');
  }

  protected peopleSummary(): string {
    const adults = this.adults();
    const children = this.children();
    const adultPart = `${adults} ${this.i18n.t(adults === 1 ? 'tour.adult' : 'tour.adults')}`;
    return children === 0 ? adultPart : `${adultPart} · ${children} ${this.i18n.t(children === 1 ? 'tour.child' : 'tour.children')}`;
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

  /** What the visitor picked, or `null` while there is no departure or quote. */
  private selection(): BookingSelection | null {
    const departure = this.departure();
    const quote = this.quote();
    if (!departure || !quote) {
      return null;
    }

    return {
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
    };
  }

  private selectionKey(): string | null {
    const s = this.selection();
    return s ? `${s.departureId}|${s.adults}|${s.children}|${s.currency}` : null;
  }

  protected addToCart(): void {
    const selection = this.selection();
    if (selection) {
      this.cart.add(selection);
      this.addedKey.set(this.selectionKey());
    }
  }

  protected async reserve(): Promise<void> {
    const selection = this.selection();
    if (!selection || this.holding()) {
      return;
    }

    this.holding.set(true);
    this.reserveError.set(null);
    const result = await this.flow.reserve(selection, this.captcha());
    this.holding.set(false);
    // The token is single-use: the next attempt needs a new one.
    this.turnstile()?.reset();

    if (!result.ok) {
      this.reserveError.set(holdErrorKey(result.status));
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
