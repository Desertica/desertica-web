import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToaster } from '@spartan-ng/helm/sonner';
import { SmoothScroll } from './core/animation/smooth-scroll';
import { I18nService } from './core/i18n/i18n';
import { TranslatePipe } from './core/i18n/translate-pipe';
import { SiteFooter } from './core/layout/site-footer';
import { SiteHeader } from './core/layout/site-header';
import { ThemeService } from './core/theme/theme';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeader, SiteFooter, HlmToaster, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly smooth = inject(SmoothScroll);

  protected readonly theme = inject(ThemeService).theme;
  protected readonly i18n = inject(I18nService);

  constructor() {
    afterNextRender(() => {
      const wrapper = this.host.nativeElement.querySelector('#smooth-wrapper');
      const content = this.host.nativeElement.querySelector('#smooth-content');
      if (wrapper instanceof HTMLElement && content instanceof HTMLElement) {
        this.smooth.start(wrapper, content);
        return;
      }

      this.smooth.markReady();
    });
  }
}
