import {
  lucideBackpack,
  lucideBadgeCheck,
  lucideBinoculars,
  lucideBus,
  lucideCalendar,
  lucideCamera,
  lucideCar,
  lucideCheck,
  lucideCircleDollarSign,
  lucideClock,
  lucideCompass,
  lucideDroplets,
  lucideGlasses,
  lucideHeart,
  lucideInfo,
  lucideLanguages,
  lucideMapPin,
  lucideMoon,
  lucideMountain,
  lucideShieldCheck,
  lucideShirt,
  lucideStar,
  lucideSun,
  lucideTent,
  lucideUsers,
  lucideUtensils,
  lucideWaves,
  lucideWind,
} from '@ng-icons/lucide';

/** Closed set of the CMS `shared.feature.icon` enum; register it with `provideIcons(FEATURE_ICONS)`. */
export const FEATURE_ICONS = {
  lucideBackpack,
  lucideBadgeCheck,
  lucideBinoculars,
  lucideBus,
  lucideCalendar,
  lucideCamera,
  lucideCar,
  lucideCheck,
  lucideCircleDollarSign,
  lucideClock,
  lucideCompass,
  lucideDroplets,
  lucideGlasses,
  lucideHeart,
  lucideInfo,
  lucideLanguages,
  lucideMapPin,
  lucideMoon,
  lucideMountain,
  lucideShieldCheck,
  lucideShirt,
  lucideStar,
  lucideSun,
  lucideTent,
  lucideUsers,
  lucideUtensils,
  lucideWaves,
  lucideWind,
};

export const DEFAULT_FEATURE_ICON = 'lucideStar';

/** An unknown or empty name must not break the render, so it becomes the default icon. */
export function featureIcon(name: string | undefined | null): string {
  return name && Object.hasOwn(FEATURE_ICONS, name) ? name : DEFAULT_FEATURE_ICON;
}
