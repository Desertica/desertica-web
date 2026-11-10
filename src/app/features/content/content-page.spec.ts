import { PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_URL } from '../../core/api/api-client';
import { mockApi } from '../../testing/mock-api';
import { settle } from '../../testing/settle';
import { ContentPage } from './content-page';

const DOC = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'TERMS',
  locale: 'en',
  version: 3,
  cmsSlug: 'terms',
  tourRefId: null,
  title: 'Terms published in the backoffice',
  text: 'The text the customer accepts.',
  publishedAt: '2026-11-10T15:00:00.000Z',
  contentHash: 'h',
};

describe('ContentPage legal documents', () => {
  let mock: ReturnType<typeof mockApi> | undefined;
  afterEach(() => mock?.restore());

  const setup = (platform: 'server' | 'browser', slug = 'terms') =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: API_URL, useValue: 'http://api.test' },
        { provide: ActivatedRoute, useValue: { data: of({ slug, titleKey: 'footer.terms' }) } },
      ],
    });

  it('shows on the server the version published in the backoffice and hands it to the browser', async () => {
    mock = mockApi({ 'GET /public/legal-documents/TERMS': () => ({ body: DOC }) });
    setup('server');
    const fixture = TestBed.createComponent(ContentPage);
    await settle(fixture);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Terms published in the backoffice');
    expect(el.textContent).toContain('The text the customer accepts.');
    expect(el.querySelector('#legal-version')?.textContent).toContain('3');
    expect(
      TestBed.inject(TransferState).get(makeStateKey<typeof DOC>('legal:TERMS:en'), null)?.id,
    ).toBe(DOC.id);
  });

  it('keeps the CMS page when no version is published', async () => {
    mock = mockApi({});
    setup('server');
    const fixture = TestBed.createComponent(ContentPage);
    await settle(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('#legal-version')).toBeNull();
  });

  it('reads the server copy in the browser instead of calling the API', async () => {
    mock = mockApi({});
    setup('browser');
    TestBed.inject(TransferState).set(makeStateKey<typeof DOC>('legal:TERMS:en'), DOC);
    const fixture = TestBed.createComponent(ContentPage);
    await settle(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Terms published',
    );
    expect(mock.calls).toHaveLength(0);
  });

  it('leaves pages that are not legal documents alone', async () => {
    mock = mockApi({});
    setup('server', 'huacachina');
    const fixture = TestBed.createComponent(ContentPage);
    await settle(fixture);

    expect(mock.calls).toHaveLength(0);
  });
});
