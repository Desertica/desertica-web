import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { HlmCalendar, HlmCalendarMulti, HlmCalendarRange, HlmMonthYearCalendar } from '@spartan-ng/helm/calendar';
import {
  HlmDateMultiInput,
  HlmDatePicker,
  HlmDatePickerInput,
  HlmDatePickerMulti,
  HlmDatePickerTrigger,
  HlmDateRangeInput,
  HlmDateRangePicker,
  HlmMonthYearInput,
  HlmMonthYearPicker,
} from '@spartan-ng/helm/date-picker';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';

@Component({
  selector: 'app-picker-harness',
  imports: [
    HlmDatePicker,
    HlmDatePickerInput,
    HlmDatePickerTrigger,
    HlmDateRangePicker,
    HlmDateRangeInput,
    HlmDatePickerMulti,
    HlmDateMultiInput,
    HlmMonthYearPicker,
    HlmMonthYearInput,
    HlmCalendar,
    HlmCalendarRange,
    HlmCalendarMulti,
    HlmMonthYearCalendar,
  ],
  template: `
    <hlm-date-picker captionLayout="dropdown" [date]="today">
      <hlm-date-picker-input />
    </hlm-date-picker>
    <hlm-date-range-picker captionLayout="dropdown">
      <hlm-date-range-input />
      <hlm-date-picker-trigger>Range</hlm-date-picker-trigger>
    </hlm-date-range-picker>
    <hlm-date-picker-multi captionLayout="dropdown" [minSelection]="1" [maxSelection]="3">
      <hlm-date-multi-input />
      <hlm-date-picker-trigger>Multi</hlm-date-picker-trigger>
    </hlm-date-picker-multi>
    <hlm-month-year-picker>
      <hlm-month-year-input />
      <hlm-date-picker-trigger>Month</hlm-date-picker-trigger>
    </hlm-month-year-picker>
    <hlm-calendar captionLayout="dropdown" [date]="today" />
    <hlm-calendar-range captionLayout="dropdown" />
    <hlm-calendar-multi captionLayout="dropdown" />
    <hlm-month-year-calendar [date]="today" />
  `,
})
class PickerHarness {
  readonly today = new Date(2026, 8, 26);
}

describe('Helm date pickers and calendars', () => {
  beforeEach(async () => {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);

    await TestBed.configureTestingModule({
      imports: [PickerHarness],
      providers: [provideSpartanHlm(), provideNativeDateAdapter()],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders each picker, commits a value, and opens the calendar', async () => {
    const fixture = TestBed.createComponent(PickerHarness);
    await fixture.whenStable();

    const single = fixture.debugElement.query(By.directive(HlmDatePicker)).componentInstance as HlmDatePicker<Date>;
    single.registerOnChange(() => undefined);
    single.registerOnTouched(() => undefined);
    single.writeValue(null);
    single.writeValue(fixture.componentInstance.today);
    single.updateDate(fixture.componentInstance.today);
    single.setDisabledState(true);
    single.updateDate(fixture.componentInstance.today);
    single.setDisabledState(false);
    single.open();

    const range = fixture.debugElement.query(By.directive(HlmDateRangePicker))
      .componentInstance as HlmDateRangePicker<Date>;
    const start = fixture.componentInstance.today;
    const end = new Date(2026, 8, 28);
    range.registerOnChange(() => undefined);
    range.registerOnTouched(() => undefined);
    range.writeValue(null);
    range.writeValue([start, end]);
    range.updateDate([start, end]);
    range.setDisabledState(true);
    range.updateDate([start, end]);
    range.setDisabledState(false);
    range.open();
    range.close();
    range.reset();

    const multi = fixture.debugElement.query(By.directive(HlmDatePickerMulti))
      .componentInstance as HlmDatePickerMulti<Date>;
    multi.registerOnChange(() => undefined);
    multi.registerOnTouched(() => undefined);
    multi.writeValue(null);
    multi.writeValue([start, end]);
    multi.updateDate([start]);
    multi.setDisabledState(true);
    multi.updateDate([start]);
    multi.setDisabledState(false);
    multi.open();
    multi.close();
    multi.touched();
    multi.reset();

    const month = fixture.debugElement.query(By.directive(HlmMonthYearPicker))
      .componentInstance as HlmMonthYearPicker<Date>;
    month.registerOnChange(() => undefined);
    month.registerOnTouched(() => undefined);
    month.writeValue(null);
    month.writeValue(start);
    month.updateDate(start);
    month.setDisabledState(true);
    month.updateDate(start);
    month.setDisabledState(false);
    month.open();
    month.touched();
    month.close();

    fixture.detectChanges();
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    for (const field of fixture.nativeElement.querySelectorAll('input')) {
      const control = field as HTMLInputElement;
      control.dispatchEvent(new FocusEvent('focus'));
      control.value = '09/26/2026';
      control.dispatchEvent(new Event('input'));
      control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      control.click();
    }
    input.dispatchEvent(new FocusEvent('blur'));

    const day = document.querySelector('button[brncalendcellbutton], [brnCalendarCellButton]') as HTMLButtonElement | null;
    day?.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('hlm-calendar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('hlm-calendar-range')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('hlm-calendar-multi')).not.toBeNull();
    expect(single.formattedDate()).toBeTruthy();
  });
});
