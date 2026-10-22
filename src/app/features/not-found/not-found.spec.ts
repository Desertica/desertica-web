import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { SeoService } from '../../core/seo/seo';
import { NotFound } from './not-found';

describe('NotFound', () => {
  afterEach(() => document.head.querySelector('meta[name="robots"]')?.remove());

  it('answers a real 404, tells crawlers not to index it and offers a way out', async () => {
    const response: ResponseInit = { status: 200 };
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideRouter([]), provideSpartanHlm(), { provide: RESPONSE_INIT, useValue: response }],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotFound);
    TestBed.inject(SeoService);
    await fixture.whenStable();
    TestBed.tick();

    expect(response.status).toBe(404);
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/', '/tours']);
  });
});
