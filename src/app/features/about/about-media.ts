const unsplash = (photo: string, size: { w?: number; h?: number } = {}): string => {
  const width = size.w ?? 1200;
  const height = size.h ?? 1200;
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
};

/** GSAP `svgOrigin` at the Ica department centroid (MapSVG viewBox 0 0 542.76703 792). */
export const ICA_SVG_ORIGIN = '249.7 606.9';

export const ABOUT_TRIO_IMAGE = unsplash('photo-1527736848781-72dc3b2ee00f', {
  w: 2400,
  h: 1400,
});

export const ABOUT_ARCHIVE_IMAGES = [
  unsplash('photo-1621795307430-3ff25aa08945', { w: 900, h: 1400 }),
  unsplash('photo-1643856120284-f47c4e9521e0', { w: 1000, h: 1600 }),
  unsplash('photo-1629401037347-c8d13f4f97f9', { w: 800, h: 1200 }),
  unsplash('photo-1739519310027-fe3fd9b04cdd', { w: 1000, h: 1500 }),
  unsplash('photo-1694949705617-ea882acee186', { w: 900, h: 1400 }),
  unsplash('photo-1623524322001-edc2423ac854', { w: 900, h: 1450 }),
] as const;
