import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DEFAULT_PUBLIC_CONFIG, PUBLIC_CONFIG } from '../config/public-config';
import { routes } from '../../app.routes';
import { bookingEngineGuard } from './booking-engine';

@Component({ template: 'booking-page' })
class Probe {}

describe('booking engine flag', () => {
  const setup = (enabled: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, bookingEngineEnabled: enabled } },
        provideRouter([
          { path: 'checkout', canMatch: [bookingEngineGuard], component: Probe },
          { path: '**', redirectTo: '' },
          { path: '', component: Probe },
        ]),
      ],
    });
  };

  it('keeps the checkout routes out of the app while the flag is off', async () => {
    setup(false);
    await RouterTestingHarness.create('/checkout');

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('serves them when the flag is on', async () => {
    setup(true);
    await RouterTestingHarness.create('/checkout');

    expect(TestBed.inject(Router).url).toBe('/checkout');
  });

  it('guards every booking engine route of the app', () => {
    const guarded = routes.filter((route) => route.canMatch?.includes(bookingEngineGuard)).map((route) => route.path);
    expect(guarded).toEqual(['checkout', 'checkout/payment/:reference', 'pay/:token', 'waiver/:token', 'payment/3ds', 'booking', 'booking/:reference']);
  });
});
