import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { filter } from 'rxjs';
import { CatalogService } from '../catalog/catalog';
import { afterNextGsap } from '../animation/gsap';
import { SmoothScroll } from '../animation/smooth-scroll';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';
import { BrandMark } from './brand-mark';

const BOUNCE_DOWN = 'M0,0C0,0,464,156,1139,156S2278,0,2278,0';
const BOUNCE_CENTER = 'M0,0C0,0,464,0,1139,0s1139,0,1139,0';
const MIN_BOUNCE_VELOCITY = 200;

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    BrandMark,
    NgIcon,
    NgOptimizedImage,
    ReactiveFormsModule,
    HlmButton,
    HlmFieldImports,
    HlmInput,
    HlmSeparator,
  ],
  templateUrl: './site-footer.html',
})
export class SiteFooter {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly smooth = inject(SmoothScroll);
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalog = inject(CatalogService);

  protected readonly i18n = inject(I18nService);
  protected readonly bounceCenter = BOUNCE_CENTER;
  protected readonly brandLinks = this.catalog.footerBrandLinks;
  protected readonly destinations = this.catalog.footerDestinations;
  protected readonly socials = this.catalog.socials;
  protected readonly contact = this.catalog.contact;
  protected readonly legal = computed(() => ({
    year: this.catalog.site().legalYear,
    name: this.catalog.site().legalName,
    ruc: this.catalog.site().ruc,
  }));
  protected readonly legalLinks = this.catalog.footerLegalLinks;
  protected readonly stamps = this.catalog.footerStamps;
  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

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

  protected subscribe(event: Event): void {
    event.preventDefault();
    if (this.email.invalid) {
      this.email.markAsTouched();
      return;
    }

    toast(this.i18n.t('footer.newsletterThanks'));
    this.email.reset();
  }
}
