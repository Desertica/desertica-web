import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { afterNextGsap } from '../animation/gsap';
import { SmoothScroll } from '../animation/smooth-scroll';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';
import { BrandMark } from './brand-mark';
import { planTripLink, primaryNavLinks } from './primary-nav';

const BOUNCE_DOWN = 'M0-0.3C0-0.3,464,156,1139,156S2278-0.3,2278-0.3V683H0V-0.3z';
const BOUNCE_CENTER = 'M0-0.3C0-0.3,464,0,1139,0s1139-0.3,1139-0.3V683H0V-0.3z';
const MIN_BOUNCE_VELOCITY = 200;

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, BrandMark],
  template: `
    <footer class="relative z-10 mt-auto min-h-48 overflow-visible sm:min-h-52">
      <svg
        class="pointer-events-none absolute inset-0 block h-full w-full overflow-visible"
        viewBox="0 0 2278 683"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path class="fill-muted" [attr.d]="bounceCenter" />
      </svg>
      <div
        class="text-muted-foreground relative z-10 mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-16 pb-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pt-20"
      >
        <p class="flex items-center gap-2.5">
          <app-brand-mark />
          <span class="text-foreground font-heading">Desértica</span>
        </p>
        <nav
          class="flex flex-wrap gap-4"
          [attr.aria-label]="'nav.footer' | translate: i18n.locale()"
        >
          @for (link of navLinks; track link.path) {
            <a [routerLink]="link.path" class="hover:text-foreground">{{
              link.labelKey | translate: i18n.locale()
            }}</a>
          }
          <a [routerLink]="planTrip.path" class="hover:text-foreground">{{
            planTrip.labelKey | translate: i18n.locale()
          }}</a>
        </nav>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly smooth = inject(SmoothScroll);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly i18n = inject(I18nService);
  protected readonly navLinks = primaryNavLinks;
  protected readonly planTrip = planTripLink;
  protected readonly bounceCenter = BOUNCE_CENTER;

  constructor() {
    let cancelled = false;
    this.destroyRef.onDestroy(() => {
      cancelled = true;
    });

    afterNextGsap((gsap, { ScrollTrigger }) => {
      const footer = this.host.nativeElement.querySelector('footer');
      const path = this.host.nativeElement.querySelector('path');
      if (!footer || !path) {
        return;
      }

      let inner: { revert: () => void } | undefined;

      void this.smooth.whenReady().then(() => {
        if (cancelled) {
          return;
        }

        inner = gsap.context(() => {
          const mm = gsap.matchMedia();
          mm.add('(prefers-reduced-motion: no-preference)', () => {
            ScrollTrigger.create({
              trigger: footer,
              start: 'top bottom',
              onEnter: (self) => {
                const velocity = Math.abs(self.getVelocity());
                if (velocity < MIN_BOUNCE_VELOCITY) {
                  return;
                }

                const variation = gsap.utils.clamp(0, 0.85, velocity / 10000);
                gsap.fromTo(
                  path,
                  { morphSVG: BOUNCE_DOWN },
                  {
                    duration: 2,
                    morphSVG: BOUNCE_CENTER,
                    ease: `elastic.out(${1 + variation}, ${1 - variation})`,
                    overwrite: true,
                  },
                );
              },
            });

            ScrollTrigger.refresh();

            const navigation = this.router.events
              .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
              .subscribe(() => ScrollTrigger.refresh());

            return () => navigation.unsubscribe();
          });
        }, footer);
      });

      return {
        revert: () => inner?.revert(),
      };
    });
  }
}
