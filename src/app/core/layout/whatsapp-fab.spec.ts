import { TestBed } from '@angular/core/testing';
import { reduceMotion, stubMatchMedia } from '../../testing/match-media';
import { settleMotion } from '../../testing/settle-motion';
import { CatalogService } from '../catalog/catalog';
import { WhatsappFab } from './whatsapp-fab';

describe('WhatsappFab', () => {
  beforeEach(async () => {
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({
      imports: [WhatsappFab],
      providers: [{ provide: CatalogService, useValue: { contact: () => ({ whatsapp: 'https://wa.me/51987654321' }) } }],
    }).compileComponents();
  });

  it('plays and reverses the tooltip', async () => {
    const fixture = TestBed.createComponent(WhatsappFab);
    await fixture.whenStable();
    await settleMotion();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    link.dispatchEvent(new PointerEvent('pointerenter'));
    link.dispatchEvent(new FocusEvent('focusin'));
    link.dispatchEvent(new PointerEvent('pointerleave'));
    link.dispatchEvent(new FocusEvent('focusout'));

    expect(link.getAttribute('href')).toContain('wa.me');
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).not.toBeNull();
    fixture.destroy();
  });

  it('shows the tooltip instantly when motion is reduced', async () => {
    stubMatchMedia(reduceMotion);
    const fixture = TestBed.createComponent(WhatsappFab);
    await fixture.whenStable();
    await settleMotion();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    link.dispatchEvent(new PointerEvent('pointerenter'));
    link.dispatchEvent(new PointerEvent('pointerleave'));

    expect(link.getAttribute('aria-describedby')).toBe('whatsapp-fab-tooltip');
    fixture.destroy();
  });
});

describe('WhatsappFab with the placeholder number', () => {
  it('is left out while the number is still the placeholder', async () => {
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({ imports: [WhatsappFab] }).compileComponents();
    const fixture = TestBed.createComponent(WhatsappFab);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    fixture.destroy();
  });
});
