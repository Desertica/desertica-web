import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import type { BookingSelection } from '../../core/booking/booking-flow';
import { formatMoney, limaDateLong, limaTime } from '../../core/booking/format';
import { CatalogService } from '../../core/catalog/catalog';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';

/** What the visitor pays today: the deposit when they chose it and the quote has one, else the total. */
export function amountToday(selection: BookingSelection, kind: 'FULL' | 'DEPOSIT'): number {
  return kind === 'DEPOSIT' && selection.quote.depositCents > 0 ? selection.quote.depositCents : selection.quote.totalCents;
}

/**
 * Order summary of the checkout: photo, tour, date and time, language, format, party, meeting point, the
 * price lines, the total and, with a deposit, what is paid today and what is left. Shown in the right
 * column on desktop and inside the folding bar on phones; the `primary` copy carries the ids.
 */
@Component({
  selector: 'app-checkout-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, TranslatePipe, HlmCardImports],
  host: { class: 'block' },
  template: `
    @let s = selection();
    <section hlmCard class="gap-4" [attr.aria-label]="'checkout.summary.heading' | translate: i18n.locale()">
      <div hlmCardContent class="flex flex-col gap-4 text-sm">
        <div class="flex items-start gap-3">
          @if (tour()?.image; as src) {
            <img [ngSrc]="src" alt="" width="80" height="80" class="size-16 shrink-0 rounded-2xl object-cover sm:size-20" />
          }
          <div class="flex min-w-0 flex-col gap-1">
            <p class="font-heading text-lg leading-tight" [attr.id]="primary() ? 'checkout-tour' : null">{{ title() }}</p>
            <p>{{ date() }} · {{ time() }}</p>
          </div>
        </div>

        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt class="text-muted-foreground">{{ 'tour.language' | translate: i18n.locale() }}</dt>
          <dd>{{ 'lang.' + s.language | translate: i18n.locale() }}</dd>
          <dt class="text-muted-foreground">{{ 'tour.format' | translate: i18n.locale() }}</dt>
          <dd>{{ (s.format === 'PRIVATE' ? 'tour.private' : 'tour.shared') | translate: i18n.locale() }}</dd>
          <dt class="text-muted-foreground">{{ 'tour.people' | translate: i18n.locale() }}</dt>
          <dd>
            {{ s.adults }} {{ (s.adults === 1 ? 'tour.adult' : 'tour.adults') | translate: i18n.locale() }}
            @if (s.children) {
              · {{ s.children }} {{ (s.children === 1 ? 'tour.child' : 'tour.children') | translate: i18n.locale() }}
            }
          </dd>
          @if (s.meetingPoint) {
            <dt class="text-muted-foreground">{{ 'myBooking.meeting' | translate: i18n.locale() }}</dt>
            <dd>{{ s.meetingPoint }}</dd>
          }
        </dl>

        <div class="border-border flex flex-col gap-1.5 border-t pt-4">
          @for (line of s.quote.lines; track $index) {
            <p class="flex justify-between gap-3">
              <span class="text-muted-foreground">{{ line.quantity }} × {{ money(line.unitCents) }} <span class="sr-only">({{ line.label }})</span></span>
              <span class="tabular-nums">{{ money(line.totalCents) }}</span>
            </p>
          }
          <p class="flex justify-between gap-3 text-base font-medium">
            <span>{{ 'booking.total' | translate: i18n.locale() }}</span>
            <span class="tabular-nums" [attr.id]="primary() ? 'checkout-total' : null">{{ money(s.quote.totalCents) }}<span class="text-muted-foreground" aria-hidden="true">*</span></span>
          </p>
          @if (deposit()) {
            <p class="flex justify-between gap-3 font-medium" [attr.id]="primary() ? 'checkout-today' : null">
              <span>{{ 'checkout.summary.today' | translate: i18n.locale() }}</span>
              <span class="tabular-nums">{{ money(s.quote.depositCents) }}</span>
            </p>
            <p class="text-muted-foreground flex justify-between gap-3">
              <span>{{ 'checkout.summary.rest' | translate: i18n.locale() }}</span>
              <span class="tabular-nums">{{ money(s.quote.totalCents - s.quote.depositCents) }}</span>
            </p>
          }
          <p class="text-muted-foreground text-xs"><span aria-hidden="true">(*) </span>{{ 'booking.taxIncluded' | translate: i18n.locale() }}</p>
        </div>
        <ng-content />
      </div>
    </section>
  `,
})
export class CheckoutSummary {
  private readonly catalog = inject(CatalogService);
  protected readonly i18n = inject(I18nService);

  readonly selection = input.required<BookingSelection>();
  readonly kind = input<'FULL' | 'DEPOSIT'>('FULL');
  /** Only one copy on the page carries the ids. */
  readonly primary = input(false);

  protected readonly tour = computed(() => this.catalog.tourById(this.selection().tourSlug));
  protected readonly title = computed(() => {
    const tour = this.tour();
    return tour ? this.i18n.t(tour.titleKey) : this.selection().tourSlug;
  });
  protected readonly date = computed(() => limaDateLong(this.selection().startsAt, this.i18n.locale()));
  protected readonly time = computed(() => limaTime(this.selection().startsAt, this.i18n.locale()));
  protected readonly deposit = computed(() => amountToday(this.selection(), this.kind()) !== this.selection().quote.totalCents);

  protected money(cents: number): string {
    return formatMoney(cents, this.selection().currency, this.i18n.locale());
  }
}
