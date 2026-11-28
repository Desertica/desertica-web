import { NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
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
import { lucideCheck, lucideChevronDown, lucideChevronUp } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCalendar } from '@spartan-ng/helm/calendar';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
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
import { limaCardDay, limaDay, limaTime, localDayKey, monthKey, formatMoney, depositText } from '../../core/booking/format';
import { PublicData } from '../../core/api/public-data';
import { CatalogService } from '../../core/catalog/catalog';
import type { CatalogTour } from '../../core/catalog/tours';
import { provideCalendarI18n } from '../../core/i18n/calendar-i18n';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { FloatingUi } from '../../core/layout/floating-ui';
import { SmoothScroll } from '../../core/animation/smooth-scroll';


/** At or below this many seats left, the count is shown in the accent colour. */
const FEW_SEATS = 3;
/** How many of the next departures are shown as one-tap cards; the rest are in the calendar. */
const DEPARTURE_CARDS = 4;

/**
 * Online booking on the tour page (shown instead of the WhatsApp form while the booking engine is
 * on): availability and prices per currency, a quote for the group, and the seat hold that starts
 * the checkout.
 */
@Component({
  selector: 'app-booking-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgOptimizedImage,
    RouterLink,
    TranslatePipe,
    HlmButton,
    HlmCalendar,
    HlmCardImports,
    HlmFieldImports,
    HlmSkeleton,
    HlmToggleGroupImports,
    HlmPopoverImports,
    HlmLabel,
    HlmRadioGroupImports,
    HlmSheetImports,
    NgIcon,
    Turnstile,
  ],
  // Here, not in app.config: the Spartan calendar would otherwise join the initial bundle.
  providers: [provideIcons({ lucideCheck, lucideChevronDown, lucideChevronUp }), provideCalendarI18n()],
  host: { class: 'block w-full' },
  template: `
    <section hlmCard class="@container">
      <div hlmCardHeader>
        <p id="booking-from" class="font-heading text-2xl tracking-wide uppercase">
          {{ 'gallery.from' | translate: i18n.locale() }} {{ fromLabel() }}
        </p>
      </div>
      <div hlmCardContent class="flex flex-col gap-6">
        <div hlmField>
          <span hlmFieldLabel id="booking-date-label">{{ 'booking.dateTime' | translate: i18n.locale() }}</span>
          @if (loading()) {
            <hlm-skeleton class="h-32 w-full" />
          } @else if (loadFailed()) {
            <p class="text-destructive text-sm" role="alert">
              {{ 'booking.loadError' | translate: i18n.locale() }}
            </p>
            <button hlmBtn type="button" variant="outline" (click)="reload()">
              {{ 'booking.retry' | translate: i18n.locale() }}
            </button>
          } @else {
            @if (upcoming().length) {
              <!-- The next departures, one tap each; the calendar stays behind "See more dates". -->
              <hlm-radio-group
                id="booking-departures"
                class="grid grid-cols-2 gap-2"
                name="booking-departure"
                aria-labelledby="booking-date-label"
                [value]="departureId()"
                (valueChange)="pickDeparture($event)"
              >
                @for (item of upcoming(); track item.departureId) {
                  <label hlmLabel [class]="cardClass" [for]="'booking-dep-' + item.departureId">
                    <hlm-radio [value]="item.departureId" [inputId]="'booking-dep-' + item.departureId" class="sr-only" />
                    <span class="flex w-full items-start justify-between gap-1">
                      <span class="text-sm font-medium first-letter:uppercase">{{ cardDay(item) }}</span>
                      @if (item.departureId === departureId()) {
                        <ng-icon name="lucideCheck" class="text-primary shrink-0" aria-hidden="true" />
                      }
                    </span>
                    <span class="text-muted-foreground text-sm font-normal tabular-nums">
                      {{ time(item) }}
                      @if (fewSeats(item)) {
                        · <span class="text-tierra font-medium">{{ fewLabel(item) }}</span>
                      }
                    </span>
                  </label>
                }
              </hlm-radio-group>
            }
            <hlm-popover align="start" sideOffset="5">
              <button
                type="button"
                id="booking-date"
                hlmPopoverTrigger
                [class]="selectClass"
              >
                <span class="truncate">{{ moreDatesLabel() }}</span>
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
            {{ time(chosen) }} ·
            <span [class.text-tierra]="fewSeats(chosen)" [class.font-medium]="fewSeats(chosen)">{{
              seatsLabel(chosen)
            }}</span>
            @if (chosen.meetingPoint) {
              · {{ chosen.meetingPoint }}
            }
          </p>
        }

        <div class="grid gap-3 @sm:grid-cols-2">
          @if (languages().length) {
            <div hlmField [style.grid-column]="showFormat() ? null : '1 / -1'">
              <span hlmFieldLabel id="booking-language-label">{{
                'tour.language' | translate: i18n.locale()
              }}</span>
              <hlm-toggle-group
                type="single"
                variant="outline"
                class="flex-wrap"
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
          }
          @if (showFormat()) {
            <div hlmField>
              <span hlmFieldLabel id="booking-format-label">{{
                'tour.format' | translate: i18n.locale()
              }}</span>
              <hlm-toggle-group
                type="single"
                variant="outline"
                class="flex-wrap"
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
          <div class="flex flex-col gap-2" role="group" aria-labelledby="booking-people-label">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm" id="booking-adults-label">{{ 'tour.adultsAge' | translate: i18n.locale() }}</span>
              <div class="flex items-center gap-2">
                <button type="button" hlmBtn size="icon-sm" variant="outline" [disabled]="adults() <= rules.adultsMin" (click)="bump('adults', -1)" [attr.aria-label]="('booking.fewer' | translate: i18n.locale()) + ': ' + ('tour.adultsAge' | translate: i18n.locale())">−</button>
                <span class="w-6 text-center tabular-nums" id="booking-adults" aria-live="polite">{{ adults() }}</span>
                <button type="button" hlmBtn size="icon-sm" variant="outline" [disabled]="!canAdd()" (click)="bump('adults', 1)" [attr.aria-label]="('booking.more' | translate: i18n.locale()) + ': ' + ('tour.adultsAge' | translate: i18n.locale())">+</button>
              </div>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm" id="booking-children-label">{{ 'tour.childrenAge' | translate: i18n.locale() }}</span>
              <div class="flex items-center gap-2">
                <button type="button" hlmBtn size="icon-sm" variant="outline" [disabled]="children() <= rules.childrenMin" (click)="bump('children', -1)" [attr.aria-label]="('booking.fewer' | translate: i18n.locale()) + ': ' + ('tour.childrenAge' | translate: i18n.locale())">−</button>
                <span class="w-6 text-center tabular-nums" id="booking-children" aria-live="polite">{{ children() }}</span>
                <button type="button" hlmBtn size="icon-sm" variant="outline" [disabled]="!canAdd()" (click)="bump('children', 1)" [attr.aria-label]="('booking.more' | translate: i18n.locale()) + ': ' + ('tour.childrenAge' | translate: i18n.locale())">+</button>
              </div>
            </div>
          </div>
        </div>

        @if (quote(); as current) {
          <div class="flex flex-col gap-1" id="booking-quote">
            <p class="flex items-baseline justify-between gap-3" aria-describedby="booking-tax-note">
              <span class="font-medium">{{ 'booking.total' | translate: i18n.locale() }}</span>
              <span id="booking-total" class="font-heading text-2xl tabular-nums">{{ short(current.totalCents, current.currency) }}<span class="text-muted-foreground" aria-hidden="true">*</span></span>
            </p>
            @if (current.depositCents > 0) {
              <!-- Only announced here; the visitor picks full or deposit once, in the checkout. -->
              <p class="text-muted-foreground text-sm" id="booking-deposit-note">{{ deposit('booking.depositOption', current) }}</p>
            }
            <p class="text-muted-foreground text-xs" id="booking-tax-note"><span aria-hidden="true">(*) </span>{{ 'booking.taxIncluded' | translate: i18n.locale() }}</p>
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
          <div class="border-border flex flex-col gap-3 rounded-3xl border p-4" role="status" id="booking-added">
            <div class="flex items-center gap-3">
              <img [ngSrc]="tour().image" alt="" width="64" height="64" class="size-16 shrink-0 rounded-2xl object-cover" />
              <div class="flex min-w-0 flex-col gap-0.5 text-sm">
                <p class="font-medium">{{ tour().titleKey | translate: i18n.locale() }}</p>
                <p class="text-muted-foreground">{{ addedLine() }}</p>
              </div>
            </div>
            <p class="flex items-center gap-2 text-sm font-medium">
              <ng-icon name="lucideCheck" class="text-tierra" aria-hidden="true" />
              {{ 'cart.added' | translate: i18n.locale() }}
            </p>
            <div class="grid gap-2 @sm:grid-cols-2">
              <a hlmBtn variant="outline" size="sm" routerLink="/tours">{{ 'cart.keepBrowsing' | translate: i18n.locale() }}</a>
              <a hlmBtn size="sm" routerLink="/cart" id="booking-view-cart">{{ 'cart.view' | translate: i18n.locale() }}</a>
            </div>
          </div>
        }
      </div>
    </section>

    <!-- Phones: moved to <body> once in the browser (the smooth scroller's transform breaks "fixed"); shown while the panel is off screen. -->
    <div #bar class="md:hidden">
      @if (barReady() && !panelInView() && hasAvailability()) {
        <div
          id="booking-bar"
          class="bg-background/95 border-border fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md"
        >
          @if (quote(); as current) {
            <hlm-sheet side="bottom" #summary="hlmSheet">
              <button hlmBtn hlmSheetTrigger side="bottom" type="button" variant="outline" size="lg" id="booking-bar-summary">
                {{ 'booking.summary' | translate: i18n.locale() }}
                <ng-icon name="lucideChevronUp" aria-hidden="true" />
              </button>
              <hlm-sheet-content *hlmSheetPortal class="rounded-t-3xl" [closeLabel]="'a11y.closeSummary' | translate: i18n.locale()">
                <hlm-sheet-header>
                  <h2 hlmSheetTitle>{{ 'booking.summaryTitle' | translate: i18n.locale() }}</h2>
                  <p hlmSheetDescription class="sr-only">{{ tour().titleKey | translate: i18n.locale() }}</p>
                </hlm-sheet-header>
                <div class="flex flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]" id="booking-summary">
                  <div class="flex items-center gap-3">
                    <img [ngSrc]="tour().image" alt="" width="64" height="64" class="size-16 shrink-0 rounded-2xl object-cover" />
                    <div class="flex min-w-0 flex-col gap-0.5 text-sm">
                      <p class="font-medium">{{ tour().titleKey | translate: i18n.locale() }}</p>
                      <p class="text-muted-foreground">{{ addedLine() }}</p>
                    </div>
                  </div>
                  @if (current.depositCents > 0) {
                    <p class="text-muted-foreground text-sm">{{ deposit('booking.depositOption', current) }}</p>
                  }
                  <p class="text-muted-foreground text-xs">{{ 'booking.taxIncluded' | translate: i18n.locale() }}</p>
                  <div class="grid grid-cols-2 gap-2">
                    <button hlmBtn type="button" variant="outline" size="lg" (click)="summary.close(); showPanel()">
                      {{ 'booking.change' | translate: i18n.locale() }}
                    </button>
                    <button hlmBtn type="button" size="lg" [disabled]="holding()" (click)="summary.close(); barReserve()">
                      {{ 'tour.book' | translate: i18n.locale() }}
                    </button>
                  </div>
                </div>
              </hlm-sheet-content>
            </hlm-sheet>
            <button hlmBtn type="button" size="lg" class="flex-1" id="booking-bar-book" [disabled]="holding()" (click)="barReserve()">
              {{ holding() ? ('booking.holding' | translate: i18n.locale()) : ('tour.book' | translate: i18n.locale()) + ' ' + short(current.totalCents, current.currency) }}
            </button>
          } @else {
            <p class="font-heading min-w-0 flex-1 truncate text-lg tracking-wide uppercase">
              {{ 'gallery.from' | translate: i18n.locale() }} {{ fromLabel() }}
            </p>
            <button hlmBtn type="button" size="lg" id="booking-bar-book" (click)="showPanel()">
              {{ 'tour.book' | translate: i18n.locale() }}
            </button>
          }
        </div>
      }
    </div>
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

  protected readonly i18n = inject(I18nService);
  /** Limits from the booking system (`/public/booking-rules`), starting party from the CMS. */
  protected get rules() {
    return this.catalog.booking();
  }
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

  private readonly publicData = inject(PublicData);
  /** Languages and format of the tour in the booking system; a filter without options is not shown. */
  private readonly apiTour = computed(() => this.publicData.tour(this.tour().id));
  protected readonly languages = computed(() => this.apiTour()?.languages ?? []);
  protected readonly showFormat = computed(() => this.apiTour()?.format === 'BOTH');
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

  /** The next departures, soonest first, as cards. */
  protected readonly upcoming = computed(() =>
    [...this.departures()].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, DEPARTURE_CARDS),
  );
  /** A departure card: the whole card is the radio; the picked one gets the primary border and a check. */
  protected readonly cardClass =
    'border-border hover:bg-muted flex cursor-pointer flex-col items-start gap-0.5 rounded-3xl border px-4 py-3 [&:has([data-checked=true])]:border-primary [&:has([data-checked=true])]:bg-primary/10 [&:has(:focus-visible)]:ring-3 [&:has(:focus-visible)]:ring-ring/30';
  /** The mobile bar waits for the browser (it lives in <body>) and hides while the panel itself is on screen. */
  protected readonly barReady = signal(false);
  protected readonly panelInView = signal(false);
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly smooth = inject(SmoothScroll);

  protected readonly isUnavailable = (date: Date): boolean => !this.byDay().has(localDayKey(date));

  constructor() {
    this.hideWhatsappWhileVisible();

    effect(() => {
      const locale = this.i18n.locale();
      const options = this.languages();
      const offer = this.apiTour()?.format;
      untracked(() => {
        this.language.set(options.includes(locale) ? locale : (options[0] ?? locale));
        this.format.set(offer === 'PRIVATE' ? 'PRIVATE' : 'SHARED');
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

  /** On phones the floating WhatsApp button would sit on top of the panel's buttons, so it steps aside while the panel is on screen. */
  private hideWhatsappWhileVisible(): void {
    const floating = inject(FloatingUi);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const bar = this.bar().nativeElement;
      document.body.appendChild(bar);
      floating.bottomBar.set(true);
      this.barReady.set(true);
      destroyRef.onDestroy(() => {
        bar.remove();
        floating.bottomBar.set(false);
      });
      if (typeof IntersectionObserver === 'undefined') {
        return;
      }

      const panel = this.host.nativeElement.querySelector('section') ?? this.host.nativeElement;
      const phone = window.matchMedia('(max-width: 767px)');
      const observer = new IntersectionObserver(([entry]) => {
        const visible = !!entry?.isIntersecting;
        this.panelInView.set(visible);
        floating.whatsappHidden.set(visible && phone.matches);
      });
      observer.observe(panel);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        floating.whatsappHidden.set(false);
      });
    });
  }

  protected showPanel(): void {
    this.smooth.scrollToElement(this.host.nativeElement);
  }

  /** The bar's button books straight away; when the panel still needs something (captcha, an error to read), it goes there instead. */
  protected async barReserve(): Promise<void> {
    if (!this.quote() || (this.captchaRequired() && !this.captcha())) {
      this.showPanel();
      return;
    }

    await this.reserve();
    if (this.reserveError()) {
      this.showPanel();
    }
  }

  protected pickDeparture(value: unknown): void {
    const picked = this.departures().find((item) => item.departureId === value);
    if (picked) {
      const [year, month, day] = limaDay(picked.startsAt).split('-').map(Number);
      this.date.set(new Date(year!, month! - 1, day!));
      this.onDeparture(picked.departureId);
    }
  }

  /** `mar 15 dic` in the business time zone. */
  protected cardDay(departure: AvailableDeparture): string {
    return limaCardDay(departure.startsAt, this.i18n.locale());
  }

  protected fewLabel(departure: AvailableDeparture): string {
    return this.i18n.t('booking.fewLeft').replace('{count}', String(departure.seatsLeft));
  }

  /** The calendar button names the day picked there, unless that departure already shows as a card. */
  protected moreDatesLabel(): string {
    const id = this.departureId();
    const onCard = id !== null && this.upcoming().some((item) => item.departureId === id);
    return this.date() && !onCard ? this.dateLabel() : this.i18n.t('booking.moreDates');
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
  /** A deposit sentence of `quote`, with its percent, today's amount and the rest. */
  protected deposit(key: string, quote: { totalCents: number; depositCents: number; currency: string }): string {
    return depositText(this.i18n.t(key), quote.totalCents, quote.depositCents, (cents) => this.short(cents, quote.currency));
  }

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

  /** Few seats left: the count turns to the terracotta accent to nudge the visitor, never red (it is not an error). */
  protected fewSeats(departure: AvailableDeparture): boolean {
    return departure.seatsLeft <= FEW_SEATS;
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

  /** `15/12/2026 · 09:00 · 2 adultos · $USD 90` under the photo of the "added" notice. */
  protected addedLine(): string {
    const departure = this.departure();
    const quote = this.quote();
    return departure && quote
      ? [this.dateLabel(), this.time(departure), this.peopleSummary(), this.short(quote.totalCents, quote.currency)].join(' · ')
      : '';
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
