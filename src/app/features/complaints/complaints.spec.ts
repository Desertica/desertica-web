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
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/forms/company')
      .flush({ legalName: 'DESERTICA S.A.C.', ruc: '20616737504', fiscalAddress: 'URB. LA PALMA GRANDE E-26, FRENTE AL CEPU, ICA' });
    await settle(fixture);
    return { fixture, form: fixture.componentInstance.form, http };
  };

  const fill = (form: ComplaintsBook['form'], overrides: Partial<ReturnType<ComplaintsBook['form']['getRawValue']>> = {}) =>
    form.patchValue({
      isReclamo: false,
      isQueja: true,
      isProduct: false,
      isService: true,
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

  type Fixture = Parameters<typeof settle>[0];
  const click = async (fixture: Fixture, id: string) => {
    (fixture.nativeElement.querySelector(`#${id}`) as HTMLButtonElement).click();
    await settle(fixture);
  };
  const next = (fixture: Fixture) => click(fixture, 'complaint-next');
  const step = (fixture: Fixture) => fixture.nativeElement.querySelector('#complaint-step')?.textContent.replace(/\s+/g, ' ').trim();
  const has = (fixture: Fixture, ...ids: string[]) =>
    ids.forEach((id) => expect(fixture.nativeElement.querySelector(`#${id}`), id).not.toBeNull());
  const submit = async (fixture: Fixture) => {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle(fixture);
  };
  /** Valid form, then through the first three steps to the one that sends it. */
  const toLastStep = async (fixture: Fixture, form: ComplaintsBook['form'], overrides: Parameters<typeof fill>[1] = {}) => {
    fill(form, overrides);
    await next(fixture);
    await next(fixture);
    await next(fixture);
  };
  const label = (fixture: Fixture, id: string) => (fixture.nativeElement.querySelector(`label[for="${id}"]`) as HTMLElement).textContent;
  const text = (fixture: Fixture) => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('shows the provider and walks through the four sections of the hoja', async () => {
    const { fixture, form } = await mount();
    const root = fixture.nativeElement as HTMLElement;

    expect(text(fixture)).toContain('Complaints book');
    expect(text(fixture)).toContain('RUC 20616737504');
    expect(text(fixture)).toContain('URB. LA PALMA GRANDE E-26, FRENTE AL CEPU, ICA');
    expect(step(fixture)).toContain('Step 1 / 4 · Consumer identification');
    has(fixture, 'cp-name', 'cp-doc-type', 'cp-doc-number', 'cp-address', 'cp-email', 'cp-phone', 'cp-minor', 'complaint-next');
    expect(root.querySelector('#complaint-back')).toBeNull();
    expect(root.querySelector('#cp-detail')).toBeNull();

    fill(form);
    await next(fixture);
    expect(step(fixture)).toContain('Step 2 / 4 · Contracted good identification');
    has(fixture, 'good-product', 'good-service', 'cp-ref', 'cp-amount', 'cp-currency', 'cp-description', 'complaint-back');
    expect(root.querySelector('#cp-name')).toBeNull();

    await next(fixture);
    expect(step(fixture)).toContain('Step 3 / 4 · Details of the complaint and request');
    has(fixture, 'kind-reclamo', 'kind-queja', 'cp-detail', 'cp-request');

    await next(fixture);
    expect(step(fixture)).toContain('Step 4 / 4 · Review and send');
    has(fixture, 'complaint-summary', 'complaint-submit', 'complaint-back');
    expect(root.querySelector('#complaint-next')).toBeNull();
    expect(text(fixture)).toContain('Ana Perez');
    expect(text(fixture)).toContain('INDECOPI');

    await click(fixture, 'complaint-back');
    expect(step(fixture)).toContain('Step 3 / 4');
  });

  it('marks the required fields with a red asterisk and leaves the optional ones without', async () => {
    const { fixture, form } = await mount();
    for (const id of ['cp-name', 'cp-doc-type', 'cp-doc-number', 'cp-address', 'cp-email']) {
      expect(label(fixture, id), id).toContain('*');
    }
    expect(label(fixture, 'cp-phone')).not.toContain('*');
    expect(fixture.nativeElement.querySelectorAll('label .text-destructive').length).toBe(5);

    fill(form);
    await next(fixture);
    expect(label(fixture, 'cp-description')).toContain('*');
    expect(label(fixture, 'cp-ref')).not.toContain('*');
    expect(label(fixture, 'cp-amount')).not.toContain('*');
  });

  it('files the complaint through the proxy and shows the correlative number and the deadline', async () => {
    const { fixture, form, http } = await mount();
    await toLastStep(fixture, form, {
      bookingRef: 'DES-2026-0001',
      amount: '120,50',
      currency: 'PEN',
      isMinor: true,
      guardianName: 'Maria Perez',
      isReclamo: true,
      isProduct: true,
    });

    await submit(fixture);
    const request = http.expectOne('/api/forms/complaint');
    expect(request.request.body).toEqual({
      kind: 'BOTH',
      goodType: 'BOTH',
      consumerName: 'Ana Perez',
      idDocType: 'DNI',
      idDocNumber: '12345678',
      address: 'Av. Lima 123, Ica',
      email: 'ana@example.com',
      phone: '+51987654321',
      isMinor: true,
      guardianName: 'Maria Perez',
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
    expect(text(fixture)).toContain('We sent a copy to your email.');
    expect(root.querySelector('form')).toBeNull();
    http.verify();
  });

  it('sends a single kind and a single good when only one box is ticked', async () => {
    const { fixture, form, http } = await mount();
    await toLastStep(fixture, form, { isReclamo: true, isQueja: false, isProduct: true, isService: false });

    await submit(fixture);
    const body = http.expectOne('/api/forms/complaint').request.body as Record<string, unknown>;
    expect(body['kind']).toBe('RECLAMO');
    expect(body['goodType']).toBe('PRODUCT');
  });

  it('validates every input before letting a step go on', async () => {
    const { fixture, form, http } = await mount();

    await next(fixture);
    expect(step(fixture)).toContain('Step 1');
    expect(text(fixture)).toContain('This field is required');

    fill(form, { consumerName: 'Ana 123' });
    await next(fixture);
    expect(step(fixture)).toContain('Step 1');
    expect(text(fixture)).toContain('Use only letters');

    fill(form, { email: 'ana@x' });
    await next(fixture);
    expect(step(fixture)).toContain('Step 1');
    expect(text(fixture)).toContain('valid email');

    fill(form, { phone: '123' });
    await next(fixture);
    expect(step(fixture)).toContain('Step 1');
    expect(text(fixture)).toContain('valid phone');

    fill(form, { idDocNumber: '12' });
    await next(fixture);
    expect(step(fixture)).toContain('Step 1');
    expect(text(fixture)).toContain('does not match the type');

    fill(form, { idDocNumber: '12345678', phone: '' });
    await next(fixture);
    expect(step(fixture)).toContain('Step 2');

    fill(form, { isService: false, amount: '50' });
    await next(fixture);
    expect(step(fixture)).toContain('Step 2');
    expect(text(fixture)).toContain('Choose at least one option');
    expect(text(fixture)).toContain('valid amount');

    fill(form, { bookingRef: 'no spaces' });
    await next(fixture);
    expect(text(fixture)).toContain('letters, numbers');
    http.expectNone('/api/forms/complaint');
  });

  it('asks for at least one kind of claim before leaving the third step', async () => {
    const { fixture, form } = await mount();
    fill(form, { isQueja: false });
    await next(fixture);
    await next(fixture);
    expect(step(fixture)).toContain('Step 3');
    await next(fixture);
    expect(step(fixture)).toContain('Step 3');
    expect(text(fixture)).toContain('Choose at least one option');
  });

  it('keeps the document number to what its type allows', async () => {
    const { fixture, form } = await mount();
    const input = fixture.nativeElement.querySelector('#cp-doc-number') as HTMLInputElement;

    input.value = '12ab34-5678999';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(form.controls.idDocNumber.value).toBe('12345678');

    form.controls.idDocType.setValue('PASSPORT');
    input.value = 'ab-12 3456';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(form.controls.idDocNumber.value).toBe('AB123456');
  });

  it('asks for the parent or guardian when the consumer is a minor', async () => {
    const { fixture, form, http } = await mount();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#cp-guardian')).toBeNull();

    fill(form, { isMinor: true });
    await settle(fixture);
    expect(root.querySelector('#cp-guardian')).not.toBeNull();
    expect(label(fixture, 'cp-guardian')).toContain('*');

    await next(fixture);
    expect(step(fixture)).toContain('Step 1');
    expect(text(fixture)).toContain('This field is required');
    http.expectNone('/api/forms/complaint');

    fill(form, { guardianName: 'Maria Perez' });
    await next(fixture);
    expect(step(fixture)).toContain('Step 2');
  });

  it('explains an unavailable book or a rejected submission and keeps what was typed', async () => {
    const { fixture, form, http } = await mount();
    await toLastStep(fixture, form);

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
