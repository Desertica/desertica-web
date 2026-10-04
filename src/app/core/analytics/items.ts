import type { CatalogTour } from '../catalog/tours';
import type { AnalyticsItem, ItemVariant } from './analytics';

/** Builds a GA4 item from a catalog tour. `title` is the tour title in the page language. */
export function tourItem(tour: CatalogTour, title: string, variant?: ItemVariant): AnalyticsItem {
  return {
    item_id: tour.id,
    item_name: title,
    item_category: tour.destination,
    ...(variant ? { item_variant: variant } : {}),
    price: tour.priceFrom,
  };
}
