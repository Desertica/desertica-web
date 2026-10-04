import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-wordmark-svg',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wordmark-svg.html',
  host: { class: 'block w-full' },
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .wordmark-svg {
      display: block;
      width: 100%;
      height: auto;
      color: currentColor;
    }

    .wordmark-svg .draw {
      fill: currentColor;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .wordmark-svg .draw.counter {
      fill: var(--primary);
      stroke: var(--primary);
    }

    .wordmark-svg .mark {
      stroke-width: 1.8;
    }

    .wordmark-svg .letter,
    .wordmark-svg .accent,
    .wordmark-svg .counter {
      stroke-width: 1.15;
    }
  `,
})
export class WordmarkSvg {}
