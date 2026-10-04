import { TransferState, makeStateKey } from '@angular/core';
import type { TestBed as TestBedType } from '@angular/core/testing';
import { CatalogService } from '../core/catalog/catalog';
import { mapCms, type RawEntry } from '../core/cms/cms-mapper';
import type { CmsSnapshot } from '../core/cms/cms-models';

const both = (make: (locale: 'en' | 'es') => RawEntry[]) => ({ en: make('en'), es: make('es') });

/** A CMS snapshot with one tour, `dune-buggy`, whose extra Strapi fields a spec chooses. */
export function tourSnapshot(extra: RawEntry): CmsSnapshot {
  return mapCms(
    {
      destinations: both(() => [{ slug: 'huacachina', order: 0, title: 'Huacachina', lead: '', allLabel: '' }]),
      tours: both((locale) => [
        {
          slug: 'dune-buggy',
          order: 0,
          durationHours: 3,
          priceFrom: 79,
          destination: { slug: 'huacachina' },
          title: locale === 'en' ? 'Dune buggy' : 'Dune buggy ES',
          description: 'Ride',
          meeting: locale === 'en' ? 'Plaza de Armas' : 'Plaza de Armas ES',
          ...extra,
        },
      ]),
    },
    { mediaBase: null, fallbackImage: () => '/img.jpg' },
  );
}

/** Hands the snapshot to `CatalogService` the way the server does, through TransferState. */
export async function loadSnapshot(testBed: typeof TestBedType, snapshot: CmsSnapshot): Promise<void> {
  testBed.inject(TransferState).set(makeStateKey<CmsSnapshot | null>('cms-snapshot'), snapshot);
  await testBed.inject(CatalogService).init();
}
