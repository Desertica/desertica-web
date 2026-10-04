import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import type { WaiverForm } from '../../core/api/booking-api';
import { loadSnapshot, tourSnapshot } from '../../testing/cms-snapshot';
import { stubMatchMedia } from '../../testing/match-media';
import { mockApi } from '../../testing/mock-api';
import { settle } from '../../testing/settle';
import { Waiver } from './waiver';

const FORM: WaiverForm = {
  status: 'PENDING',
  version: 3,
  tourSlug: 'dune-buggy',
  startsAt: '2026-12-01T14:00:00.000Z',
  passengerName: 'Ana Quispe',
  minAge: 8,
  minHeightCm: 120,
};

describe('Waiver', () => {
  let mock: ReturnType<typeof mockApi> | undefined;

  const setup = async (withText: boolean) => {
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideSpartanHlm()],
    }).compileComponents();
    await loadSnapshot(TestBed, tourSnapshot(withText ? { waiverBody: 'I accept the **risks** of the dunes.' } : {}));
  };

  afterEach(() => mock?.restore());

  const mount = async (routes: Parameters<typeof mockApi>[0]) => {
    mock = mockApi(routes);
    const fixture = TestBed.createComponent(Waiver);
    fixture.componentRef.setInput('token', 'wv-token-1');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const type = (selector: string, value: string) => {
      const input = root.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const check = (selector: string) => (root.querySelector(selector) as HTMLInputElement).click();
    const submit = async () => {
      (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
      await settle(fixture, 8);
    };
    return { fixture, root, type, check, submit };
  };

  it('shows the waiver, its version and the requirements, and signs it with the contract fields', async () => {
    await setup(true);
    const { root, type, check, submit } = await mount({
      'GET /public/waivers/*': () => ({ body: FORM }),
      'POST /public/waivers/*/sign': () => ({ body: { ...FORM, status: 'SIGNED' } }),
    });

    expect(mock?.calls[0]?.path).toBe('/public/waivers/wv-token-1');
    expect(root.textContent).toContain('Ana Quispe');
    expect(root.textContent).toContain('Waiver version 3');
    expect(root.textContent).toContain('Minimum age (years): 8');
    expect(root.textContent).toContain('120 cm');
    expect(root.querySelector('article')?.textContent).toContain('I accept the risks of the dunes.');

    check('#w-minor');
    type('#w-name', 'Rosa Quispe');
    type('#w-doc-number', '12345678');
    type('#w-medical', 'Peanut allergy');
    type('#w-emergency-name', 'Luis');
    type('#w-emergency-phone', '+51 999 000 111');
    check('#w-accept');
    await submit();

    const sign = mock?.calls.find((call) => call.path.endsWith('/sign'));
    expect(sign?.body).toEqual({
      signerName: 'Rosa Quispe',
      signerDocType: 'DNI',
      signerDocNumber: '12345678',
      onBehalfOfMinor: true,
      medicalNotes: 'Peanut allergy',
      emergencyContactName: 'Luis',
      emergencyContactPhone: '+51 999 000 111',
      accepted: true,
    });
    expect(root.querySelector('#waiver-signed')).not.toBeNull();
  });

  it('does not sign without acceptance, a name or a document that fits its type', async () => {
    await setup(true);
    const { root, type, check, submit } = await mount({ 'GET /public/waivers/*': () => ({ body: FORM }) });

    await submit();
    expect(root.textContent).toContain('This field is required');
    expect(root.textContent).toContain('You need to accept this to continue');

    type('#w-name', 'Ana');
    type('#w-doc-number', '123');
    check('#w-accept');
    await submit();
    expect(root.textContent).toContain('does not match the type');
    expect(mock?.calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('keeps the form closed when the tour has no waiver text: nobody signs what they cannot read', async () => {
    await setup(false);
    const { root } = await mount({ 'GET /public/waivers/*': () => ({ body: FORM }) });

    expect(root.querySelector('#waiver-no-text')).not.toBeNull();
    expect(root.querySelector('form')).toBeNull();
  });

  it('shows an already signed waiver, a conflict on sign and an invalid link', async () => {
    await setup(true);
    const signed = await mount({ 'GET /public/waivers/*': () => ({ body: { ...FORM, status: 'SIGNED' } }) });
    expect(signed.root.querySelector('#waiver-signed')).not.toBeNull();
    expect(signed.root.querySelector('form')).toBeNull();
    mock?.restore();
    TestBed.resetTestingModule();

    await setup(true);
    const conflict = await mount({
      'GET /public/waivers/*': () => ({ body: FORM }),
      'POST /public/waivers/*/sign': () => ({ status: 409, body: { message: 'signed' } }),
    });
    conflict.type('#w-name', 'Ana');
    conflict.type('#w-doc-number', '12345678');
    conflict.check('#w-accept');
    await conflict.submit();
    expect(conflict.root.querySelector('#waiver-error')?.textContent).toContain('already signed');
    mock?.restore();
    TestBed.resetTestingModule();

    await setup(true);
    const missing = await mount({ 'GET /public/waivers/*': () => ({ status: 404, body: { message: 'x' } }) });
    expect(missing.root.querySelector('#waiver-missing')).not.toBeNull();
  });
});
