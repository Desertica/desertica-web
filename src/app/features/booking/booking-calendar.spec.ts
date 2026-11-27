import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { HlmCalendar } from '@spartan-ng/helm/calendar';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { settle } from '../../testing/settle';

const FOCUSED = new Date(2026, 10, 27);
const ONLY_DECEMBER_DAY = new Date(2026, 11, 15);

@Component({
  imports: [HlmCalendar],
  template: `<hlm-calendar
    [min]="focused"
    [defaultFocusedDate]="focused"
    [dateDisabled]="isUnavailable"
  />`,
})
class Host {
  focused = FOCUSED;
  isUnavailable = (date: Date) =>
    date.getTime() !== FOCUSED.getTime() && date.getTime() !== ONLY_DECEMBER_DAY.getTime();
}

describe('Booking calendar next-month button', () => {
  it('reaches a month whose only departure is on a different day of the month', async () => {
    await TestBed.configureTestingModule({
      providers: [provideSpartanHlm(), provideNativeDateAdapter()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const next = root.querySelector<HTMLButtonElement>('button[brnCalendarNextButton]')!;

    expect(next.disabled).toBe(false);
    next.click();
    await settle(fixture);

    const enabled = [...root.querySelectorAll<HTMLButtonElement>('button[role="gridcell"]')].filter(
      (cell) => !cell.disabled,
    );
    expect(enabled.map((cell) => cell.textContent?.trim())).toEqual(['15']);
  });
});
