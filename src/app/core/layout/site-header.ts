import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, HlmButtonImports, HlmSheetImports],
  template: `
    <header class="border-border/60 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a routerLink="/" class="font-heading text-lg tracking-tight text-foreground">
          Desertica
        </a>

        <nav class="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Primary">
          <a
            routerLink="/"
            fragment="experiences"
            class="text-muted-foreground hover:text-foreground transition-colors"
          >
            Experiences
          </a>
          <a
            routerLink="/reservations"
            routerLinkActive="text-foreground"
            class="text-muted-foreground hover:text-foreground transition-colors"
          >
            Reservations
          </a>
        </nav>

        <div class="hidden md:block">
          <a hlmBtn routerLink="/reservations">Book now</a>
        </div>

        <hlm-sheet #menu class="md:hidden">
          <button hlmBtn variant="outline" size="sm" hlmSheetTrigger type="button">Menu</button>
          <hlm-sheet-content *hlmSheetPortal side="right" class="w-72">
            <hlm-sheet-header>
              <h2 hlmSheetTitle>Desertica</h2>
              <p hlmSheetDescription>Desert experiences in Ica, Peru.</p>
            </hlm-sheet-header>
            <nav class="mt-6 flex flex-col gap-4 text-sm font-medium" aria-label="Mobile">
              <a routerLink="/" fragment="experiences" (click)="menu.close()">Experiences</a>
              <a routerLink="/reservations" (click)="menu.close()">Reservations</a>
              <a hlmBtn routerLink="/reservations" (click)="menu.close()">Book now</a>
            </nav>
          </hlm-sheet-content>
        </hlm-sheet>
      </div>
    </header>
  `,
})
export class SiteHeader {}
