import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { toast } from '@spartan-ng/brain/sonner';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { FormsApi } from '../../core/cms/forms-api';
import { DEFAULT_PUBLIC_CONFIG, PUBLIC_CONFIG } from '../../core/config/public-config';
import { remoteImageLoader } from '../../core/images/remote-image-loader';
import { settle } from '../../testing/settle';
import { Contact } from './contact';

vi.mock('@spartan-ng/brain/sonner', () => ({ toast: vi.fn() }));

type Options = { callback: (token: string) => void };

describe('Contact with Turnstile', () => {
  const submitContact = vi.fn();
  const render = vi.fn<(element: HTMLElement, options: Options) => string>(() => 'widget-1');
  const reset = vi.fn();

  beforeEach(async () => {
    submitContact.mockReset().mockResolvedValue(true);
    render.mockClear();
    reset.mockClear();
    vi.mocked(toast).mockClear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    (window as unknown as { turnstile: unknown }).turnstile = { render, reset, remove: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [Contact],
      providers: [
        provideSpartanHlm(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
        { provide: FormsApi, useValue: { submitContact } },
        { provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, turnstileSiteKey: '0xKEY' } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as unknown as { turnstile?: unknown }).turnstile;
  });

  const fillForm = (fixture: ReturnType<typeof TestBed.createComponent<Contact>>) =>
    fixture.componentInstance.form.patchValue({
      name: 'Ana Perez',
      email: 'ana@example.com',
      whatsapp: '987654321',
      message: 'Hola',
    });

  it('replaces the placeholder checkbox with the real challenge', async () => {
    const fixture = TestBed.createComponent(Contact);
    await settle(fixture);

    expect(fixture.nativeElement.querySelector('app-turnstile')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#contact-captcha')).toBeNull();
    expect(render).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ sitekey: '0xKEY' }));
  });

  it('blocks the submit until the challenge is solved, then sends the token and resets it', async () => {
    const fixture = TestBed.createComponent(Contact);
    await settle(fixture);
    fillForm(fixture);
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    submit.click();
    await settle(fixture);
    expect(submitContact).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Confirm you are not a robot');

    (render.mock.calls[0]?.[1] as Options).callback('turnstile-token');
    await settle(fixture);
    submit.click();
    await settle(fixture);

    expect(submitContact).toHaveBeenCalledWith(expect.objectContaining({ turnstileToken: 'turnstile-token', email: 'ana@example.com' }));
    expect(reset).toHaveBeenCalled();
  });
});
