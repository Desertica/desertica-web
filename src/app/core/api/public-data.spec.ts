import { ApplicationRef, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CatalogService } from '../catalog/catalog';
import { mockApi } from '../../testing/mock-api';
import { loadPublicApi, publicTour } from '../../testing/public-api';
import { API_URL } from './api-client';
import { PublicData, meetingMapUrl } from './public-data';

const tour = publicTour({
  durationHours: 2,
  format: 'BOTH',
  languages: ['es', 'en'],
  meetingPoint: { en: 'Main square', es: 'Plaza de Armas' },
  latitude: -14.1,
  longitude: -75.7,
});
const rules = { depositPercent: 30, availabilityMonths: 6, adultsMin: 2, childrenMin: 0, peopleMax: 8 };
const company = { legalName: 'DESERTICA S.A.C.', ruc: '20616737504', fiscalAddress: 'Ica' };

describe('PublicData', () => {
  let mock: ReturnType<typeof mockApi> | undefined;
  afterEach(() => mock?.restore());

  const setup = (platform: 'server' | 'browser', apiUrl: string | null = 'http://api.test') =>
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: API_URL, useValue: apiUrl },
      ],
    });

  it('loads tours, rules and company on the server and hands them to the browser', async () => {
    mock = mockApi({
      'GET /public/tours': () => ({ body: { data: [tour] } }),
      'GET /public/booking-rules': () => ({ body: rules }),
      'GET /public/company': () => ({ body: company }),
    });
    setup('server');
    const data = TestBed.inject(PublicData);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(data.tour('dune-buggy')).toEqual(tour);
    expect(data.tour('unknown')).toBeUndefined();
    expect(data.rules()).toEqual(rules);
    expect(data.company()).toEqual(company);
    expect(TestBed.inject(TransferState).get(makeStateKey<object>('api-public-data'), {})).toEqual({
      tours: { 'dune-buggy': tour },
      rules,
      company,
    });
  });

  it('keeps what did answer when one endpoint fails (company not configured: 404)', async () => {
    mock = mockApi({
      'GET /public/tours': () => ({ body: { data: [tour] } }),
      'GET /public/booking-rules': () => ({ status: 500, body: {} }),
    });
    setup('server');
    const data = TestBed.inject(PublicData);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(data.tour('dune-buggy')?.durationHours).toBe(2);
    expect(data.rules()).toBeNull();
    expect(data.company()).toBeNull();
  });

  it('answers nothing, without throwing, when the API is unreachable or not configured', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new Error('ECONNREFUSED'))) as typeof fetch;
    try {
      setup('server');
      const data = TestBed.inject(PublicData);
      await TestBed.inject(ApplicationRef).whenStable();
      expect(data.tour('dune-buggy')).toBeUndefined();
      expect(data.rules()).toBeNull();
      expect(data.company()).toBeNull();
    } finally {
      globalThis.fetch = original;
    }

    TestBed.resetTestingModule();
    mock = mockApi({});
    setup('server', null);
    expect(TestBed.inject(PublicData).rules()).toBeNull();
    expect(mock.calls).toHaveLength(0);

    TestBed.resetTestingModule();
    setup('browser');
    expect(TestBed.inject(PublicData).company()).toBeNull();
  });

  it('gives the catalog the API limits and fiscal identity, and safe ones without the API', () => {
    setup('browser');
    const offline = TestBed.inject(CatalogService);
    expect(offline.booking()).toMatchObject({ adultsMin: 1, childrenMin: 0, peopleMax: 12, availabilityMonths: 3, depositRate: null });
    expect(offline.legal()).toEqual({ year: 2026, name: 'Desértica', ruc: null });

    TestBed.resetTestingModule();
    setup('browser');
    loadPublicApi(TestBed, { rules, company });
    const catalog = TestBed.inject(CatalogService);
    // The CMS starting party (1 adult) is below the API minimum, so it is raised to it.
    expect(catalog.booking()).toMatchObject({ adultsMin: 2, adultsDefault: 2, peopleMax: 8, availabilityMonths: 6, depositRate: 0.3 });
    expect(catalog.legal()).toEqual({ year: 2026, name: 'DESERTICA S.A.C.', ruc: '20616737504' });
  });
});

describe('meetingMapUrl', () => {
  it('prefers the link, falls back to the coordinates and is null without either', () => {
    expect(meetingMapUrl({ ...tour, meetingPointUrl: 'https://maps.example/meet' })).toBe('https://maps.example/meet');
    expect(meetingMapUrl(tour)).toBe('https://www.google.com/maps/search/?api=1&query=-14.1,-75.7');
    expect(meetingMapUrl(publicTour())).toBeNull();
    expect(meetingMapUrl(undefined)).toBeNull();
  });
});
