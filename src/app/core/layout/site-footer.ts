import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <footer class="border-border bg-muted/40 mt-auto border-t">
      <div
        class="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <p>
          <span class="text-foreground font-heading">Desertica</span>
          — guided desert days in Ica and Huacachina.
        </p>
        <nav class="flex gap-4" aria-label="Footer">
          <a routerLink="/" class="hover:text-foreground">Home</a>
          <a routerLink="/reservations" class="hover:text-foreground">Reservations</a>
        </nav>
      </div>
    </footer>
  `,
})
export class SiteFooter {}
