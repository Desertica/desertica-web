import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="border-border/60 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a
          routerLink="/"
          class="text-foreground flex items-center gap-2.5 font-heading text-lg tracking-tight"
        >
          <img src="logo.svg" width="40" height="40" alt="" class="size-10 shrink-0 rounded-md" />
          Desértica
        </a>

        <nav class="flex items-center gap-6 text-sm font-medium" aria-label="Primary">
          <a
            routerLink="/"
            routerLinkActive="text-foreground"
            [routerLinkActiveOptions]="{ exact: true }"
            class="text-muted-foreground hover:text-foreground transition-colors"
          >
            Home
          </a>
          <a
            routerLink="/experiences/placeholder"
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
      </div>
    </header>
  `,
})
export class SiteHeader {}
