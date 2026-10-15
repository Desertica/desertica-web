import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { stubMatchMedia } from '../../testing/match-media';
import { settle } from '../../testing/settle';
import { ComplaintsBook } from './complaints';

describe('ComplaintsBook', () => {
  beforeEach(async () => {
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideSpartanHlm(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  const mount = async () => {
    const fixture = TestBed.createComponent(ComplaintsBook);
    await settle(fixture);
    return { fixture, form: fixture.componentInstance.form, http: TestBed.inject(HttpTestingController) };
  };

  const fill = (form: ComplaintsBook['form'], overrides: Partial<ReturnType<ComplaintsBook['form']['getRawValue']>> = {}) =>
    form.patchValue({
      kind: 'QUEJA',
      goodType: 'SERVICE',
      consumerName: 'Ana Perez',
      idDocType: 'DNI',
      idDocNumber: '12345678',
      address: 'Av. Lima 123, Ica',
      email: 'ana@example.com',
      phone: '+51987654321',
      description: 'Dune buggy tour, 2026-12-01',
      detail: 'The tour started two hours late.',
      request: 'Partial refund.',
      ...overrides,
    });

  const submit = async (fixture: Parameters<typeof settle>[0]) => {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle(fixture);
  };

  it('renders every field of CreateComplaint and the provider identification', async () => {
    const { fixture } = await mount();
    const root = fixture.nativeElement as HTMLElement;

    for (const id of ['cp-name', 'cp-doc-type', 'cp-doc-number', 'cp-address', 'cp-email', 'cp-phone', 'cp-minor', 'cp-ref', 'cp-amount', 'cp-currency', 'cp-description', 'cp-detail', 'cp-request']) {
      expect(root.querySelector(`#${id}`), id).not.toBeNull();
    }
    expect(root.querySelectorAll('hlm-radio')).toHaveLength(4);
    expect(root.textContent).toContain('Complaints book');
    expect(root.textContent).toContain('RUC');
    expect(root.textContent).toContain('INDECOPI');
  });

  it('files the complaint through the proxy and shows the correlative number and the deadline', async () => {
    const { fixture, form, http } = await mount();
    fill(form, { bookingRef: 'DES-2026-0001', amount: '120,50', currency: 'PEN', isMinor: true });

    await submit(fixture);
    const request = http.expectOne('/api/forms/complaint');
    expect(request.request.body).toEqual({
      kind: 'QUEJA',
      goodType: 'SERVICE',
      consumerName: 'Ana Perez',
      idDocType: 'DNI',
      idDocNumber: '12345678',
      address: 'Av. Lima 123, Ica',
      email: 'ana@example.com',
      phone: '+51987654321',
      isMinor: true,
      bookingRef: 'DES-2026-0001',
      amountCents: 12050,
      currency: 'PEN',
      description: 'Dune buggy tour, 2026-12-01',
      detail: 'The tour started two hours late.',
      request: 'Partial refund.',
    });
    request.flush({ ok: true, correlative: 42, dueAt: '2026-12-31T00:00:00.000Z' });
    await settle(fixture);

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#complaint-number')?.textContent).toBe('42');
    expect(root.querySelector('#complaint-due')?.textContent).toContain('2026');
    expect(root.textContent).toContain('We sent a copy to your email.');
    expect(root.querySelector('form')).toBeNull();
    http.verify();
  });

  it('does not send an incomplete form, a document that does not fit, or an amount without currency', async () => {
    const { fixture, form, http } = await mount();

    await submit(fixture);
    http.expectNone('/api/forms/complaint');
    expect(fixture.nativeElement.textContent).toContain('This field is required');

    fill(form, { idDocNumber: '12' });
    await submit(fixture);
    http.expectNone('/api/forms/complaint');
    expect(fixture.nativeElement.textContent).toContain('does not match the type');

    fill(form, { amount: '50' });
    await submit(fixture);
    http.expectNone('/api/forms/complaint');
    expect(fixture.nativeElement.textContent).toContain('valid amount');
  });

  it('explains an unavailable book or a rejected submission and keeps what was typed', async () => {
    const { fixture, form, http } = await mount();
    fill(form);

    await submit(fixture);
    http.expectOne('/api/forms/complaint').flush({ error: 'api_disabled' }, { status: 503, statusText: 'Unavailable' });
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('#complaint-error')?.textContent).toContain('not available right now');
    expect(form.controls.detail.value).toBe('The tour started two hours late.');

    await submit(fixture);
    http.expectOne('/api/forms/complaint').flush({ error: 'invalid' }, { status: 400, statusText: 'Bad Request' });
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('#complaint-error')?.textContent).toContain('check the fields');
  });
});
