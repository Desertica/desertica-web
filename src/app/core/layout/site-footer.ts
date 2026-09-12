import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { filter } from 'rxjs';
import { afterNextGsap } from '../animation/gsap';
import { SmoothScroll } from '../animation/smooth-scroll';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';
import { BrandMark } from './brand-mark';
import {
  footerBrandLinks,
  footerContact,
  footerDestinations,
  footerLegalEntity,
  footerLegalLinks,
  footerSocials,
  footerStamps,
} from './footer-nav';

const BOUNCE_DOWN = 'M0-0.3C0-0.3,464,156,1139,156S2278-0.3,2278-0.3V683H0V-0.3z';
const BOUNCE_CENTER = 'M0-0.3C0-0.3,464,0,1139,0s1139-0.3,1139-0.3V683H0V-0.3z';
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

  protected readonly i18n = inject(I18nService);
  protected readonly bounceCenter = BOUNCE_CENTER;
  protected readonly brandLinks = footerBrandLinks;
  protected readonly destinations = footerDestinations;
  protected readonly socials = footerSocials;
  protected readonly contact = footerContact;
  protected readonly legal = footerLegalEntity;
  protected readonly legalLinks = footerLegalLinks;
  protected readonly stamps = footerStamps;
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
