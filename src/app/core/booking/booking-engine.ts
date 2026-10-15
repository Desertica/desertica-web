import { inject } from '@angular/core';
import type { CanMatchFn } from '@angular/router';
import { PUBLIC_CONFIG } from '../config/public-config';

/** Routes of the booking engine only exist while `BOOKING_ENGINE_ENABLED` is true. */
export const bookingEngineGuard: CanMatchFn = () => inject(PUBLIC_CONFIG).bookingEngineEnabled;
