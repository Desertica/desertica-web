import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMenu, lucideMoon, lucideSun } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmNavigationMenuImports } from '@spartan-ng/helm/navigation-menu';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { PlanTripHover } from '../animation/plan-trip-hover';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';
import { ThemeService } from '../theme/theme';
import { BrandMark } from './brand-mark';
import { LocaleSwitcher } from './locale-switcher';
import { isNavGroup, navItemTrack, planTripLink, primaryNavLinks } from './primary-nav';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    HlmButton,
    NgIcon,
    HlmNavigationMenuImports,
    HlmSheetImports,
    LocaleSwitcher,
    TranslatePipe,
    PlanTripHover,
    BrandMark,
  ],
  providers: [provideIcons({ lucideMenu, lucideMoon, lucideSun })],
  template: `
    <header class="border-border/60 bg-background/90 fixed inset-x-0 top-0 z-40 border-b backdrop-blur-md">
      <div
        class="mx-auto flex min-h-14 items-center justify-between gap-3 px-4 sm:min-h-16 sm:px-6 lg:min-h-20 lg:px-10"
      >
        <a
          routerLink="/"
          class="text-foreground flex min-w-0 items-center gap-2 font-heading text-lg tracking-tight sm:gap-2.5 sm:text-xl"
        >
          <app-brand-mark />
          Desértica
        </a>

        <div class="flex min-w-0 items-center gap-1.5 sm:gap-4">
          <nav
            hlmNavigationMenu
            class="hidden lg:flex"
            [attr.aria-label]="'nav.primary' | translate: i18n.locale()"
          >
            <ul hlmNavigationMenuList>
              @for (item of navLinks; track item.path) {
                <li hlmNavigationMenuItem>
                  @if (isGroup(item)) {
                    <button type="button" hlmNavigationMenuTrigger align="center">
                      {{ item.labelKey | translate: i18n.locale() }}
                    </button>
                    <hlm-navigation-menu-content
                      *hlmNavigationMenuPortal
                      [navOffset]="0"
                      class="max-w-[min(36rem,calc(100vw-2rem))]"
                    >
                      @if (item.columns?.length) {
                        <ul class="grid w-full min-w-0 gap-2 lg:grid-cols-3">
                          @for (child of item.children; track navTrack(child)) {
                            <li class="min-w-0 lg:col-span-3">
                              <a
                                hlmNavigationMenuLink
                                [routerLink]="child.path"
                                [fragment]="child.fragment"
                              >
                                <div class="flex flex-col gap-1 text-sm">
                                  <div class="leading-none font-medium">
                                    {{ child.labelKey | translate: i18n.locale() }}
                                  </div>
                                  @if (child.descriptionKey) {
                                    <div class="text-muted-foreground line-clamp-2">
                                      {{ child.descriptionKey | translate: i18n.locale() }}
                                    </div>
                                  }
                                </div>
                              </a>
                            </li>
                          }
                          @for (column of item.columns; track column.fragment) {
                            <li class="flex min-w-0 flex-col gap-1">
                              <a
                                hlmNavigationMenuLink
                                [routerLink]="column.path"
                                [fragment]="column.fragment"
                              >
                                <div class="leading-none font-medium">
                                  {{ column.headingKey | translate: i18n.locale() }}
                                </div>
                              </a>
                              @for (child of column.children; track navTrack(child)) {
                                <a
                                  hlmNavigationMenuLink
                                  [routerLink]="child.path"
                                  [fragment]="child.fragment"
                                >
                                  <div class="flex flex-col gap-1 text-sm">
                                    <div class="leading-none font-medium">
                                      {{ child.labelKey | translate: i18n.locale() }}
                                    </div>
                                    @if (child.descriptionKey) {
                                      <div class="text-muted-foreground line-clamp-2">
                                        {{ child.descriptionKey | translate: i18n.locale() }}
                                      </div>
                                    }
                                  </div>
                                </a>
                              }
                            </li>
                          }
                        </ul>
                      } @else {
                        <ul class="w-80">
                          @for (child of item.children; track navTrack(child)) {
                            <li>
                              <a
                                hlmNavigationMenuLink
                                [routerLink]="child.path"
                                [fragment]="child.fragment"
                              >
                                <div class="flex flex-col gap-1 text-sm">
                                  <div class="leading-none font-medium">
                                    {{ child.labelKey | translate: i18n.locale() }}
                                  </div>
                                  @if (child.descriptionKey) {
                                    <div class="text-muted-foreground line-clamp-2">
                                      {{ child.descriptionKey | translate: i18n.locale() }}
                                    </div>
                                  }
                                </div>
                              </a>
                            </li>
                          }
                        </ul>
                      }
                    </hlm-navigation-menu-content>
                  } @else {
                    <a
                      hlmNavigationMenuLink
                      [routerLink]="item.path"
                      routerLinkActive
                      #rla="routerLinkActive"
                      [active]="rla.isActive"
                      [attr.aria-current]="rla.isActive ? 'page' : null"
                    >
                      {{ item.labelKey | translate: i18n.locale() }}
                    </a>
                  }
                </li>
              }
            </ul>
          </nav>

          <a
            hlmBtn
            appPlanTripHover
            size="lg"
            class="hidden shrink-0 transition-none lg:inline-flex"
            [routerLink]="planTrip.path"
          >
            {{ planTrip.labelKey | translate: i18n.locale() }}
          </a>

          <hlm-sheet #mobileNav="hlmSheet" side="right">
            <button
              hlmBtn
              hlmSheetTrigger
              type="button"
              variant="ghost"
              size="icon"
              side="right"
              class="shrink-0 lg:hidden"
              [attr.aria-label]="'a11y.openMenu' | translate: i18n.locale()"
            >
              <ng-icon name="lucideMenu" />
            </button>
            <hlm-sheet-content *hlmSheetPortal>
              <hlm-sheet-header>
                <h2 hlmSheetTitle>{{ 'menu.title' | translate: i18n.locale() }}</h2>
                <p hlmSheetDescription class="sr-only">
                  {{ 'menu.description' | translate: i18n.locale() }}
                </p>
              </hlm-sheet-header>
              <nav
                class="flex flex-col gap-1 px-4 pb-6"
                [attr.aria-label]="'nav.primary' | translate: i18n.locale()"
              >
                @for (item of navLinks; track item.path) {
                  @if (isGroup(item)) {
                    <p
                      class="text-foreground px-3 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase"
                    >
                      {{ item.labelKey | translate: i18n.locale() }}
                    </p>
                    @for (child of item.children; track navTrack(child)) {
                      <a
                        [routerLink]="child.path"
                        [fragment]="child.fragment"
                        routerLinkActive="bg-muted text-foreground"
                        class="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
                        (click)="mobileNav.close()"
                      >
                        {{ child.labelKey | translate: i18n.locale() }}
                      </a>
                    }
                    @for (column of item.columns ?? []; track column.fragment) {
                      <a
                        [routerLink]="column.path"
                        [fragment]="column.fragment"
                        class="text-foreground px-3 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase"
                        (click)="mobileNav.close()"
                      >
                        {{ column.headingKey | translate: i18n.locale() }}
                      </a>
                      @for (child of column.children; track navTrack(child)) {
                        <a
                          [routerLink]="child.path"
                          [fragment]="child.fragment"
                          routerLinkActive="bg-muted text-foreground"
                          class="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
                          (click)="mobileNav.close()"
                        >
                          {{ child.labelKey | translate: i18n.locale() }}
                        </a>
                      }
                    }
                  } @else {
                    <a
                      [routerLink]="item.path"
                      routerLinkActive="bg-muted text-foreground"
                      class="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
                      (click)="mobileNav.close()"
                    >
                      {{ item.labelKey | translate: i18n.locale() }}
                    </a>
                  }
                }
                <a
                  hlmBtn
                  appPlanTripHover
                  class="mt-2 transition-none"
                  [routerLink]="planTrip.path"
                  (click)="mobileNav.close()"
                >
                  {{ planTrip.labelKey | translate: i18n.locale() }}
                </a>
                <div class="mt-4">
                  <app-locale-switcher />
                </div>
              </nav>
            </hlm-sheet-content>
          </hlm-sheet>

          <app-locale-switcher />

          <button
            hlmBtn
            type="button"
            variant="ghost"
            size="icon"
            class="shrink-0"
            [attr.aria-label]="'a11y.toggleTheme' | translate: i18n.locale()"
            (click)="theme.toggle()"
          >
            <span class="inline-flex dark:hidden" aria-hidden="true">
              <ng-icon name="lucideMoon" />
            </span>
            <span class="hidden dark:inline-flex" aria-hidden="true">
              <ng-icon name="lucideSun" />
            </span>
          </button>
        </div>
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18nService);
  protected readonly navLinks = primaryNavLinks;
  protected readonly planTrip = planTripLink;
  protected readonly isGroup = isNavGroup;
  protected readonly navTrack = navItemTrack;
}
