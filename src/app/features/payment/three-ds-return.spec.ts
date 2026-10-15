import { TestBed } from '@angular/core/testing';
import { resetScriptCache } from '../../core/payments/third-party-script';
import { CULQI_3DS_SRC } from '../../core/payments/culqi-loader';
import { settle } from '../../testing/settle';
import { ThreeDsReturn } from './three-ds-return';

describe('ThreeDsReturn', () => {
  afterEach(() => {
    document.head.querySelectorAll('script').forEach((script) => script.remove());
    resetScriptCache();
  });

  it('loads only the Culqi 3DS script, once the page is in the browser', async () => {
    const fixture = TestBed.createComponent(ThreeDsReturn);
    await settle(fixture);

    const scripts = Array.from(document.head.querySelectorAll('script[src]')).map((script) => (script as HTMLScriptElement).src);
    expect(scripts).toEqual([CULQI_3DS_SRC + '/']);
    expect(fixture.nativeElement.textContent).toContain('Completing the verification');
  });
});
