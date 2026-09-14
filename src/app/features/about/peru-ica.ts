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
      color: #3d4a2a;
    }

    .about-map-svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    [data-peru] {
      fill: none;
      stroke: #3d4a2a;
      stroke-opacity: 1;
      stroke-width: 2.15;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    [data-lake] {
      fill: none;
      stroke: #3d4a2a;
      stroke-opacity: 0.4;
      stroke-width: 0.7;
    }

    [data-ica] {
      fill: #5a6b3e;
      stroke: #3d4a2a;
      stroke-width: 2.4;
      stroke-linejoin: round;
    }

    [data-map-label] {
      fill: #3d4a2a;
      font-family: var(--font-heading);
      font-size: 16px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    @media (prefers-reduced-motion: reduce) {
      [data-ica] {
        fill-opacity: 1;
      }
    }
  `,
})
export class PeruIca {
  protected readonly origin = ICA_SVG_ORIGIN;
}
