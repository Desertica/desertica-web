import type { ComponentFixture } from '@angular/core/testing';

/**
 * Lets the mocked API answer and the signals it feeds settle. `whenStable()` alone does not wait
 * for plain promises such as a `fetch` call, so this yields to the event loop a few times.
 */
export async function settle(fixture: ComponentFixture<unknown>, rounds = 6): Promise<void> {
  for (let round = 0; round < rounds; round += 1) {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }
}
