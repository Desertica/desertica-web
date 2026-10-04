import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BLOG_CONTENT, BlogIndexData, BlogPost } from '../../core/catalog/blog';
import { remoteImageLoader } from '../../core/images/remote-image-loader';
import { Blog } from './blog';

const samplePost: BlogPost = {
  slug: 'dunas-al-atardecer',
  title: 'Dunas al atardecer',
  excerpt: 'Una tarde en las dunas de Huacachina.',
  publishedAt: '2026-03-15T12:00:00.000Z',
  category: 'Huacachina',
  cover: {
    url: '/about/sand-poster.jpg',
    alt: 'Dunas de Ica',
  },
};

const sampleIndex: BlogIndexData = {
  hero: {
    url: '/about/sand-poster.jpg',
    alt: '',
  },
  posts: [samplePost],
};

describe('Blog', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('shows a coming soon banner that links to tours when there are no posts', async () => {
    await TestBed.configureTestingModule({
      imports: [Blog],
      providers: [
        provideRouter([]),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Blog);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Coming soon');
    expect(compiled.textContent).toContain('Stories from Ica and Huacachina.');
    expect(compiled.textContent).toContain('Blog');

    const link = compiled.querySelector('a[href="/tours"]');
    expect(link).not.toBeNull();
    expect(link?.textContent?.trim()).toBe('Tours');
    expect(link?.className).toContain('rounded-4xl');

    const banner = compiled.querySelector('img');
    expect(banner?.getAttribute('src')).toContain('sand-poster');
    expect(banner?.className).toContain('rounded-none');
    expect(banner?.closest('section')?.className).toContain('h-[min(50svh,28rem)]');
    expect(compiled.querySelector('.grid')).toBeNull();
  });

  it('renders a post grid with title, excerpt, and detail link when posts are provided', async () => {
    await TestBed.configureTestingModule({
      imports: [Blog],
      providers: [
        provideRouter([]),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
        { provide: BLOG_CONTENT, useValue: sampleIndex },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Blog);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Blog');
    expect(compiled.querySelector('a[href="/tours"]')).toBeNull();

    const postLink = compiled.querySelector('a[href="/blog/dunas-al-atardecer"]');
    expect(postLink).not.toBeNull();
    expect(postLink?.textContent).toContain('Dunas al atardecer');
    expect(postLink?.textContent).toContain('Una tarde en las dunas de Huacachina.');
    expect(postLink?.querySelector('img')?.className).toContain('aspect-square');
    expect(postLink?.querySelector('img')?.className).toContain('rounded-none');
    expect(postLink?.closest('.max-w-6xl')).not.toBeNull();
  });
});

