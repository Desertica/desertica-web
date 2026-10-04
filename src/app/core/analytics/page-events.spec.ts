import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { stubMatchMedia } from '../../testing/match-media';
import { settleMotion } from '../../testing/settle-motion';
import { Contact } from '../../features/contact/contact';
import { Tours } from '../../features/tours/tours';
import { TourDetail } from '../../features/tours/detail/tour-detail';
import { FormsApi } from '../cms/forms-api';
import { remoteImageLoader } from '../images/remote-image-loader';
import { WhatsappFab } from '../layout/whatsapp-fab';
import { AnalyticsService } from './analytics';

vi.mock('@spartan-ng/brain/sonner', () => ({ toast: vi.fn() }));

describe('analytics events on the pages', () => {
  const track = vi.fn();
  const submitContact = vi.fn();

  beforeEach(async () => {
    track.mockReset();
    submitContact.mockReset().mockResolvedValue(true);
    vi.mocked(toast).mockClear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideSpartanHlm(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
        { provide: AnalyticsService, useValue: { track } },
        { provide: FormsApi, useValue: { submitContact } },
      ],
    }).compileComponents();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('publishes view_item_list for the tour list and select_item on a click', async () => {
    const fixture = TestBed.createComponent(Tours);
    await fixture.whenStable();

    const list = track.mock.calls.find(([name]) => name === 'view_item_list');
    expect(list?.[1].item_list_name).toBe('tours');
    expect(list?.[1].items[0]).toMatchObject({ item_id: 'dune-buggy', item_category: 'huacachina' });

    const link = fixture.nativeElement.querySelector('a[href="/tours/dune-buggy"]') as HTMLAnchorElement;
    link.addEventListener('click', (event) => event.preventDefault());
    link.click();
    const select = track.mock.calls.find(([name]) => name === 'select_item');
    expect(select?.[1].items).toHaveLength(1);
    expect(select?.[1].items[0].item_id).toBe('dune-buggy');
  });

  it('publishes view_item once per tour with currency and value', async () => {
    const fixture = TestBed.createComponent(TourDetail);
    fixture.componentRef.setInput('id', 'dune-buggy');
    await fixture.whenStable();
    fixture.componentRef.setInput('id', 'dune-buggy');
    await fixture.whenStable();

    const views = track.mock.calls.filter(([name]) => name === 'view_item');
    expect(views).toHaveLength(1);
    expect(views[0]?.[1]).toMatchObject({
      currency: 'USD',
      value: 79,
      items: [{ item_id: 'dune-buggy', item_name: 'Dune buggy' }],
    });
  });

  it('publishes click_whatsapp from the floating button', async () => {
    const fixture = TestBed.createComponent(WhatsappFab);
    await fixture.whenStable();
    await settleMotion();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    link.addEventListener('click', (event) => event.preventDefault());
    link.click();

    expect(track).toHaveBeenCalledWith('click_whatsapp', { placement: 'floating_button' });
    fixture.destroy();
  });

  it('publishes generate_lead only after the contact form is stored', async () => {
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    const form = (fixture.componentInstance as unknown as { form: Contact['form'] }).form;
    form.setValue({
      name: 'Ana Perez',
      email: 'ana@example.com',
      whatsapp: '987654321',
      message: 'Hola',
      captcha: true,
    });
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    submitContact.mockResolvedValueOnce(false);
    submit.click();
    await fixture.whenStable();
    expect(track).not.toHaveBeenCalledWith('generate_lead', expect.anything());

    submit.click();
    await fixture.whenStable();
    expect(track).toHaveBeenCalledWith('generate_lead', { form: 'contact' });
  });
});
