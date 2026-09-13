import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { toast } from '@spartan-ng/brain/sonner';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { remoteImageLoader } from '../../core/images/remote-image-loader';
import { Contact } from './contact';
import { GEOJS_COUNTRY_URL } from './phone';

vi.mock('@spartan-ng/brain/sonner', () => ({
  toast: vi.fn(),
}));

describe('Contact', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.mocked(toast).mockClear();
    fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      }),
    });

    await TestBed.configureTestingModule({
      imports: [Contact],
      providers: [provideSpartanHlm(), { provide: IMAGE_LOADER, useValue: remoteImageLoader }],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a centered inquiry form with a photo band and a Turnstile placeholder', async () => {
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Contact');
    expect(compiled.textContent).toContain('Questions about tours and dates');
    expect(compiled.textContent).toContain('We reply on WhatsApp');
    expect(compiled.textContent).toContain('Monday to Saturday');
    expect(compiled.querySelector('.grid.md\\:grid-cols-2')).not.toBeNull();
    const photo = compiled.querySelector('img[src*="photo-1533106497176-45ae19e68ba2"]');
    expect(photo).not.toBeNull();
    expect(photo?.className).toContain('rounded-none');
    expect(photo?.closest('.rounded-2xl')).toBeNull();
    expect(photo?.closest('.min-h-72')).not.toBeNull();
    expect(photo?.getAttribute('sizes')).toContain('50vw');
    expect(photo?.getAttribute('sizes')).toContain('92vw');
    expect(compiled.querySelector('#contact-name')).not.toBeNull();
    expect(compiled.querySelector('#contact-email')).not.toBeNull();
    expect(compiled.querySelector('#contact-whatsapp')).not.toBeNull();
    expect(compiled.querySelector('[data-country]')?.getAttribute('data-country')).toBe('PE');
    expect(compiled.querySelector('#contact-country')?.textContent).toContain('+51');
    expect(compiled.querySelector('#contact-message')).not.toBeNull();
    expect(compiled.querySelector('#contact-captcha')?.getAttribute('type')).toBe('checkbox');
    expect(compiled.textContent).toContain("I'm not a robot");
    expect(compiled.textContent).toContain('Turnstile');
    expect(compiled.querySelector('script[src*="cloudflare"]')).toBeNull();
    expect(compiled.querySelector('button[type="submit"]')?.textContent).toContain('Send');
  });

  it('opens a searchable list of countries from the flag trigger', async () => {
    const fixture = TestBed.createComponent(Contact);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('#contact-country')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const overlay = document.body;
    expect(overlay.textContent).toContain('Peru');
    expect(overlay.textContent).toContain('+51');
    expect(overlay.textContent).toContain('Spain');
    expect(overlay.textContent).toContain('+34');
    expect(overlay.querySelector('input[placeholder="Search country"]')).not.toBeNull();
    const list = overlay.querySelector('[data-slot="combobox-list"]');
    expect(list).not.toBeNull();
    expect(list?.className).toContain('overflow-y-auto');
    expect(list?.className).toContain('max-h-60');
    expect(list?.className).not.toContain('no-scrollbar');
    expect(overlay.querySelectorAll('[data-slot="combobox-item"]').length).toBeGreaterThan(20);
  });

  it('trims extra WhatsApp digits to the Peru maximum', async () => {
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    setInput(compiled, '#contact-whatsapp', '987654321999');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.querySelector<HTMLInputElement>('#contact-whatsapp')?.value).toBe(
      '987 654 321',
    );
    expect(compiled.querySelector('[data-country]')?.getAttribute('data-country')).toBe('PE');
  });

  it('shows field errors and skips the toast when the form is empty', async () => {
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.textContent).toContain('Enter your name');
    expect(compiled.textContent).toContain('Enter a valid email');
    expect(compiled.textContent).toContain('valid WhatsApp number');
    expect(compiled.textContent).toContain('Enter a message');
    expect(compiled.textContent).toContain('not a robot');
    expect(toast).not.toHaveBeenCalled();
  });

  it('rejects a WhatsApp value that is not a valid number', async () => {
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    fill(fixture.nativeElement, {
      name: 'Ana',
      email: 'ana@desertica.pe',
      whatsapp: 'abc',
      message: 'Hola',
      captcha: true,
    });
    fixture.detectChanges();
    compiledSubmit(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('valid WhatsApp number');
    expect(toast).not.toHaveBeenCalled();
  });

  it('switches the flag when an international number is pasted', async () => {
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    setInput(compiled, '#contact-whatsapp', '+34600111222');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.querySelector('[data-country]')?.getAttribute('data-country')).toBe('ES');
    expect(compiled.querySelector('#contact-country')?.textContent).toContain('+34');
    expect(compiled.querySelector<HTMLInputElement>('#contact-whatsapp')?.value).toContain('600');
  });

  it('guesses the country from IP when the number is still empty', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ country: 'ES', ip: '1.1.1.1' }),
    });
    const fixture = TestBed.createComponent(Contact);
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fetchMock).toHaveBeenCalledWith(
      GEOJS_COUNTRY_URL,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(
      fixture.nativeElement.querySelector('[data-country]')?.getAttribute('data-country'),
    ).toBe('ES');
  });

  it('keeps the user country when GeoJS returns later', async () => {
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ country: 'ES', ip: '1.1.1.1' }),
            });
          }, 30);
        }),
    );
    const fixture = TestBed.createComponent(Contact);
    fixture.detectChanges();
    await fixture.whenStable();
    setInput(fixture.nativeElement, '#contact-whatsapp', '987654321');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-country]')?.getAttribute('data-country'),
    ).toBe('PE');
  });

  it('keeps Peru when GeoJS fails', async () => {
    const fixture = TestBed.createComponent(Contact);
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-country]')?.getAttribute('data-country'),
    ).toBe('PE');
  });

  it('toasts and resets when the inquiry is valid', async () => {
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    fill(compiled, {
      name: 'Ana',
      email: 'ana@desertica.pe',
      whatsapp: '+51 999 999 999',
      message: 'Quiero info del buggy',
      captcha: true,
    });
    fixture.detectChanges();
    compiledSubmit(compiled);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(toast).toHaveBeenCalledWith("Message sent. We'll write back soon.");
    expect(compiled.querySelector<HTMLInputElement>('#contact-name')?.value).toBe('');
    expect(compiled.querySelector<HTMLInputElement>('#contact-email')?.value).toBe('');
    expect(compiled.querySelector<HTMLInputElement>('#contact-whatsapp')?.value).toBe('');
    expect(compiled.querySelector<HTMLTextAreaElement>('#contact-message')?.value).toBe('');
    expect(compiled.querySelector<HTMLInputElement>('#contact-captcha')?.checked).toBe(false);
    expect(
      compiled
        .querySelector('#contact-country')
        ?.closest('[data-country]')
        ?.getAttribute('data-country'),
    ).toBe('PE');
  });
});

function compiledSubmit(root: HTMLElement): void {
  root.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
}

function fill(
  root: HTMLElement,
  values: { name: string; email: string; whatsapp: string; message: string; captcha: boolean },
): void {
  setInput(root, '#contact-name', values.name);
  setInput(root, '#contact-email', values.email);
  setInput(root, '#contact-whatsapp', values.whatsapp);
  setInput(root, '#contact-message', values.message);
  const captcha = root.querySelector<HTMLInputElement>('#contact-captcha');
  if (captcha && captcha.checked !== values.captcha) {
    captcha.click();
  }
}

function setInput(root: HTMLElement, selector: string, value: string): void {
  const el = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!el) {
    return;
  }

  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
