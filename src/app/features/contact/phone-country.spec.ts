import { TestBed } from '@angular/core/testing';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { settle } from '../../testing/settle';
import { PhoneCountryPicker } from './phone-country';

describe('PhoneCountryPicker', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideSpartanHlm()] }));

  it('shows the chosen country on a full-height trigger and reports a new pick', async () => {
    const fixture = TestBed.createComponent(PhoneCountryPicker);
    fixture.componentRef.setInput('buttonId', 'x-country');
    await settle(fixture);
    const trigger = fixture.nativeElement.querySelector('#x-country') as HTMLElement;
    const host = () => (fixture.nativeElement as HTMLElement).querySelector('[data-country]')?.getAttribute('data-country');
    expect(host()).toBe('PE');
    expect(trigger.className).toContain('h-9');

    const picked: string[] = [];
    fixture.componentInstance.country.subscribe((code) => picked.push(code));
    (fixture.componentInstance as unknown as { pick(value: unknown): void }).pick({ code: 'CL' });
    (fixture.componentInstance as unknown as { pick(value: unknown): void }).pick({ code: 'ZZ' });
    await settle(fixture);

    expect(picked).toEqual(['CL']);
    expect(host()).toBe('CL');
  });
});
