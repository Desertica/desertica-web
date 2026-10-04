import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterNextGsap } from './gsap';

vi.mock('gsap', () => {
  throw new Error('chunk failed to load');
});

@Component({ selector: 'app-gsap-failure-host', template: '' })
class FailureHost {
  created = false;

  constructor() {
    afterNextGsap(() => {
      this.created = true;
    });
  }
}

describe('afterNextGsap when the plugins fail to load', () => {
  afterEach(() => TestBed.resetTestingModule());

  // Vitest itself fails the run on an unhandled rejection, so reaching the assertions proves none.
  it('logs the failure instead of leaving an unhandled rejection', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const fixture = TestBed.createComponent(FailureHost);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fixture.componentInstance.created).toBe(false);
    expect(error).toHaveBeenCalledWith(
      '[gsap] could not load the animation plugins',
      expect.any(Error),
    );
    error.mockRestore();
  });
});
