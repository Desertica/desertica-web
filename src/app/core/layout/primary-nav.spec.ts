import { packageChildren, packageGalleryItems } from './primary-nav';

describe('package gallery items', () => {
  it('keeps three featured stays for the home strip', () => {
    expect(packageGalleryItems().map((item) => item.path)).toEqual([
      '/experiences/huacachina-weekend',
      '/experiences/sunset-wine',
      '/experiences/oasis-overnight',
    ]);
  });

  it('includes every package placeholder on /packages', () => {
    expect(packageChildren().map((item) => item.path)).toEqual([
      '/packages',
      '/experiences/huacachina-weekend',
      '/experiences/sunset-wine',
      '/experiences/oasis-overnight',
    ]);
  });
});
