import { Injectable } from '@angular/core';
import { Experience } from '../models/experience';

const EXPERIENCES: readonly Experience[] = [
  {
    slug: 'huacachina-dune-buggy',
    name: 'Huacachina dune buggy',
    tagline: 'Ride the tallest dunes around the oasis.',
    location: 'Huacachina, Ica',
    duration: '2 hours',
    groupSize: 'Up to 8 guests',
    priceFrom: 65,
    currency: 'USD',
    imageUrl:
      'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Sand dunes near an oasis under a clear desert sky',
    summary:
      'A sunset buggy run across the Huacachina dunes with a sandboarding stop on the ridgeline.',
    description:
      'Meet at the oasis, then climb into an open dune buggy for a guided loop through the Ica desert. Drivers pick ridgelines with views back to Huacachina, pause for sandboarding, and time the return for golden hour. Helmets and boards are included; the route stays on established dune tracks.',
    highlights: [
      'Guided buggy circuit on the Huacachina dunes',
      'Sandboarding on a selected face',
      'Sunset timing when the schedule allows',
      'Hotel pickup in Huacachina village',
    ],
  },
  {
    slug: 'ica-vineyard-sunset',
    name: 'Ica vineyard sunset',
    tagline: 'Pisco, vines, and desert light.',
    location: 'Ica Valley',
    duration: '4 hours',
    groupSize: 'Up to 12 guests',
    priceFrom: 90,
    currency: 'USD',
    imageUrl:
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Rows of grapevines in warm evening light',
    summary: 'Walk a family vineyard, taste pisco and wine, and watch the dunes turn copper at dusk.',
    description:
      'Ica’s valleys sit between the Pacific fog and the desert. This afternoon visit covers how grapes survive in sand, a tasting of pisco and still wines, and a terrace hour as the light drops. Small groups keep the cellar walk unhurried; a light board of local snacks is served with the tasting.',
    highlights: [
      'Guided walk through working vines',
      'Pisco and wine tasting flight',
      'Terrace time at sunset',
      'Round-trip transfer from Huacachina or Ica',
    ],
  },
  {
    slug: 'oasis-night-camp',
    name: 'Oasis night camp',
    tagline: 'Sleep under a dry-sky desert.',
    location: 'Ica Desert',
    duration: 'Overnight',
    groupSize: 'Up to 10 guests',
    priceFrom: 180,
    currency: 'USD',
    imageUrl:
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Desert camp tents at dusk with a wide sky',
    summary: 'A one-night camp beyond the oasis: dinner on the dunes, stargazing, and a sunrise walk.',
    description:
      'Leave Huacachina in the late afternoon and set camp where the village lights fall away. Dinner is cooked on site, then a short astronomy briefing uses the lack of humidity to point out southern-sky constellations. Morning is a ridge walk before returning to town. Tents, bedding, and meals are provided.',
    highlights: [
      'Private camp away from the oasis traffic',
      'Dinner and breakfast included',
      'Guided stargazing',
      'Sunrise walk on a nearby dune',
    ],
  },
  {
    slug: 'sunrise-dune-walk',
    name: 'Sunrise dune walk',
    tagline: 'Quiet miles before the buggies start.',
    location: 'Huacachina, Ica',
    duration: '3 hours',
    groupSize: 'Up to 8 guests',
    priceFrom: 45,
    currency: 'USD',
    imageUrl:
      'https://images.unsplash.com/photo-1682686580391-615b1f28e5ee?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Footprints on a sand dune at sunrise',
    summary: 'A pre-dawn walk to a high dune for first light over Huacachina and the Ica plain.',
    description:
      'Start in the dark with headlamps and a slow climb to a viewpoint above the oasis. The walk is unhurried, with stops for photos and a thermos breakfast at the top. This is the quieter side of Huacachina — no engines, just wind and the village waking below. Fitness is moderate; the sand makes the climb slower than it looks.',
    highlights: [
      'Pre-dawn departure from the village',
      'Ridge viewpoint over the oasis',
      'Coffee and a light breakfast',
      'Small-group guiding',
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class ExperiencesService {
  list(): readonly Experience[] {
    return EXPERIENCES;
  }

  getBySlug(slug: string): Experience | undefined {
    return EXPERIENCES.find((experience) => experience.slug === slug);
  }
}
