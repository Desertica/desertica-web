import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_PUBLIC_CONFIG, PUBLIC_CONFIG } from '../config/public-config';
import { Turnstile } from './turnstile';

@Component({
  imports: [Turnstile],
  template: `<app-turnstile (tokenChange)="tokens.push($event)" />`,
})
class Host {
  tokens: (string | null)[] = [];
}

type Options = { sitekey: string; language: string; callback: (token: string) => void; 'expired-callback': () => void };

describe('Turnstile', () => {
  const render = vi.fn<(element: HTMLElement, options: Options) => string>(() => 'widget-1');
  const reset = vi.fn();

  beforeEach(() => {
    render.mockClear();
    reset.mockClear();
    (window as unknown as { turnstile: unknown }).turnstile = { render, reset, remove: vi.fn() };
  });

  afterEach(() => {
    delete (window as unknown as { turnstile?: unknown }).turnstile;
    document.head.querySelectorAll('script[src*="turnstile"]').forEach((node) => node.remove());
  });

  const mount = async (siteKey: string | null) => {
    TestBed.configureTestingModule({
      providers: [{ provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, turnstileSiteKey: siteKey } }],
    });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    return fixture;
  };

  it('renders nothing and loads no script without a site key', async () => {
    const fixture = await mount(null);

    expect(render).not.toHaveBeenCalled();
    expect(document.head.querySelector('script[src*="turnstile"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('div')).toBeNull();
  });

  it('renders the widget with the site key and the page language and reports tokens', async () => {
    const fixture = await mount('0xSITEKEY');

    expect(render).toHaveBeenCalledTimes(1);
    const options = render.mock.calls[0]?.[1] as Options;
    expect(options.sitekey).toBe('0xSITEKEY');
    expect(options.language).toBe('en');

    options.callback('token-1');
    options['expired-callback']();
    expect(fixture.componentInstance.tokens).toEqual(['token-1', null]);
  });

  it('resets the single-use challenge and clears the token', async () => {
    const fixture = await mount('0xSITEKEY');
    const turnstile = fixture.debugElement.children[0]?.componentInstance as Turnstile;

    turnstile.reset();

    expect(reset).toHaveBeenCalledWith('widget-1');
    expect(fixture.componentInstance.tokens).toEqual([null]);
  });
});
