import { swapToPlaceholder } from './placeholder';

describe('swapToPlaceholder', () => {
  it('replaces src once, drops srcset and keeps alt', () => {
    const img = document.createElement('img');
    img.alt = 'Dunes';
    img.setAttribute('srcset', 'a.jpg 1x');
    img.src = 'https://x.test/broken.jpg';

    swapToPlaceholder(img, '/placeholder.svg');
    expect(img.getAttribute('src')).toBe('/placeholder.svg');
    expect(img.hasAttribute('srcset')).toBe(false);
    expect(img.alt).toBe('Dunes');

    swapToPlaceholder(img, '/other.svg');
    expect(img.getAttribute('src')).toBe('/placeholder.svg');
  });
});
