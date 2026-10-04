import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ICA_SVG_ORIGIN } from './about-media';

@Component({
  selector: 'app-peru-ica',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './peru-ica.html',
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      color: var(--primary);
    }

    .about-map-svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    [data-peru] {
      fill: none;
      stroke: currentColor;
      stroke-opacity: 1;
      stroke-width: 2.15;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    [data-lake] {
      fill: none;
      stroke: currentColor;
      stroke-opacity: 0.75;
      stroke-width: 1.2;
    }

    [data-ica] {
      fill: var(--primary);
      fill-opacity: 0;
      stroke: currentColor;
      stroke-width: 2.4;
      stroke-linejoin: round;
    }

    @media (prefers-reduced-motion: reduce) {
      [data-ica] {
        fill-opacity: 0.18;
      }
    }
  `,
})
export class PeruIca {
  protected readonly origin = ICA_SVG_ORIGIN;
}
