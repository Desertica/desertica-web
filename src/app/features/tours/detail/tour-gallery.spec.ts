import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { TourGallery } from './tour-gallery';

function render(count: number) {
  const fixture = TestBed.createComponent(TourGallery);
  fixture.componentRef.setInput(
    'photos',
    Array.from({ length: count }, (_, i) => `https://img/${i}.jpg`),
  );
  fixture.componentRef.setInput('title', 'Tour');
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('TourGallery', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [TourGallery] }));

  it('shows how many photos are hidden behind the third tile', () => {
    const el = render(6);
    expect(el.querySelectorAll('section > div > div').length).toBe(6);
    expect(el.querySelector('section > div > div:nth-child(3) button span')?.textContent).toContain(
      '+3',
    );
  });

  it('shows no counter with three photos or fewer', () => {
    expect(render(3).querySelector('section > div button span')).toBeNull();
  });

  it('steps through the viewer and wraps around', () => {
    const fixture = TestBed.createComponent(TourGallery);
    fixture.componentRef.setInput('photos', ['a', 'b', 'c', 'd']);
    fixture.componentRef.setInput('title', 'Tour');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const counter = () => el.querySelector('dialog span')?.textContent?.trim();
    const [, prev, next] = el.querySelectorAll<HTMLButtonElement>('dialog button');
    expect(counter()).toBe('1 / 4');
    prev.click();
    fixture.detectChanges();
    expect(counter()).toBe('4 / 4');
    next.click();
    fixture.detectChanges();
    expect(counter()).toBe('1 / 4');
  });

  it('loads the viewer photo through the image loader, not the original upload', () => {
    TestBed.overrideProvider(IMAGE_LOADER, {
      useValue: ({ src, width }: { src: string; width?: number }) => `/_img?w=${width}&u=${src}`,
    });
    const fixture = TestBed.createComponent(TourGallery);
    fixture.componentRef.setInput('photos', ['a.jpg', 'b.jpg']);
    fixture.componentRef.setInput('title', 'Tour');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const img = el.querySelector<HTMLImageElement>('dialog img')!;
    expect(img.getAttribute('src')).toBe('/_img?w=1280&u=a.jpg');
    expect(img.getAttribute('srcset')).toBe(
      '/_img?w=768&u=a.jpg 768w, /_img?w=1280&u=a.jpg 1280w, /_img?w=1920&u=a.jpg 1920w',
    );
    el.querySelectorAll<HTMLButtonElement>('dialog button')[2].click();
    fixture.detectChanges();
    expect(img.getAttribute('src')).toBe('/_img?w=1280&u=b.jpg');
  });
});
