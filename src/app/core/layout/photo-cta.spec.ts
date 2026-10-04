import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { TOURS_CLOSER_IMAGE } from '../catalog/tours';
import { remoteImageLoader } from '../images/remote-image-loader';
import { PhotoCta } from './photo-cta';

describe('PhotoCta', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoCta],
      providers: [
        provideRouter([]),
        provideSpartanHlm(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
      ],
    }).compileComponents();
  });

  it('renders a 500px photo closer with title, lead, and link', async () => {
    const fixture = TestBed.createComponent(PhotoCta);
    fixture.componentRef.setInput('image', TOURS_CLOSER_IMAGE);
    fixture.componentRef.setInput('titleKey', 'about.closerTitle');
    fixture.componentRef.setInput('leadKey', 'about.closerLead');
    fixture.componentRef.setInput('ctaLabelKey', 'nav.tours');
    fixture.componentRef.setInput('ctaLink', '/tours');
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('section');
    expect(section?.className).toContain('h-[500px]');
    expect(section?.className).toContain('w-full');

    const photo = compiled.querySelector('img');
    expect(photo?.getAttribute('src')).toContain('photo-1516026672322-bc52d61a55d5');
    expect(photo?.getAttribute('sizes')).toContain('100vw');
    expect(photo?.getAttribute('alt')).toBe('');
    expect(photo?.className).toContain('object-cover');
    expect(photo?.className).toContain('object-center');

    const overlay = compiled.querySelector('.photo-cta-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.className).toContain('items-center');
    expect(overlay?.className).toContain('justify-end');
    expect(overlay?.className).toContain('text-center');
    expect(overlay?.className).toContain('z-10');
    expect(overlay?.querySelector('h2')?.textContent?.trim()).toBe('Shall we build your day?');
    expect(overlay?.querySelector('p')?.textContent).toContain(
      'Huacachina, Paracas, and Nazca. You pick the axis; we handle the rest.',
    );

    const cta = overlay?.querySelector('a[href="/tours"]');
    expect(cta?.textContent?.trim()).toBe('Tours');
    expect(cta?.className).toContain('pointer-events-auto');
  });
});
