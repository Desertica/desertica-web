/** Field limits of `CreateComplaint`, shared by the form and the proxy validation. */
export const COMPLAINT_LIMITS = {
  name: 120,
  address: 200,
  email: 254,
  phone: 32,
  bookingRef: 64,
  description: 500,
  detail: 2000,
  request: 1000,
  /** Highest amount accepted, in minor units. */
  amountCents: 1_000_000_000,
} as const;
