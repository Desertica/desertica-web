import en from '../../../locales/en.json';
import es from '../../../locales/es.json';
import { isFiller } from '../cms/cms-mapper';
import { createBlogIndexStub } from './blog';
import { tourPage } from './tour-pages';
import { catalogTours, tourDestinations } from './tours';

/** Every string inside a value, with the path it was found at. */
function strings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') {
    return [[path, value]];
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => strings(child, `${path}.${key}`));
  }
  return [];
}

const filler = (value: unknown) =>
  strings(value)
    .filter(([, text]) => /lorem ipsum/i.test(text) || isFiller(text))
    .map(([path]) => path);

describe('no placeholder text', () => {
  it('has no Lorem ipsum in the locale files', () => {
    expect(filler({ en, es })).toEqual([]);
  });

  it('has no Lorem ipsum in the static catalog', () => {
    expect(
      filler({
        tourDestinations,
        pages: catalogTours.map(tourPage),
        blog: createBlogIndexStub(),
      }),
    ).toEqual([]);
  });
});
