import { InjectionToken } from '@angular/core';
import type { CmsConfig } from './cms-models';

export const DEFAULT_CMS_CONFIG: CmsConfig = {
  url: null,
  publicUrl: null,
  token: null,
  cacheTtlMs: 30_000,
  timeoutMs: 5_000,
};

export const CMS_CONFIG = new InjectionToken<CmsConfig>('CMS_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_CMS_CONFIG,
});

/** Builds the config from the process environment (server only). */
export function cmsConfigFromEnv(env: Record<string, string | undefined>): CmsConfig {
  const url = clean(env['STRAPI_URL']);
  return {
    url,
    publicUrl: clean(env['STRAPI_PUBLIC_URL']) ?? url,
    token: env['STRAPI_API_TOKEN']?.trim() || null,
    cacheTtlMs: positiveInt(env['STRAPI_CACHE_TTL_MS'], DEFAULT_CMS_CONFIG.cacheTtlMs),
    timeoutMs: positiveInt(env['STRAPI_TIMEOUT_MS'], DEFAULT_CMS_CONFIG.timeoutMs),
  };
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/+$/, '');
  return trimmed ? trimmed : null;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
