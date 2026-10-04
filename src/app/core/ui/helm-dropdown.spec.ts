import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';

@Component({
  selector: 'app-menu-harness',
  imports: [HlmButton, HlmDropdownMenuImports],
  template: `
    <button hlmBtn type="button" [hlmDropdownMenuTrigger]="menu">Open</button>
    <ng-template #menu>
      <div hlmDropdownMenu>
        <button type="button" hlmDropdownMenuCheckbox checked (triggered)="toggle()">Check</button>
        <button type="button" hlmDropdownMenuRadio checked>Radio</button>
        <button type="button" hlmDropdownMenuSubTrigger [hlmDropdownMenuSubTrigger]="sub">More</button>
      </div>
    </ng-template>
    <ng-template #sub>
      <div hlmDropdownMenuSub>
        <button type="button" hlmDropdownMenuItem>Child</button>
      </div>
    </ng-template>
  `,
})
class MenuHarness {
  toggle(): void {}
}

describe('Helm dropdown menu pieces', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuHarness],
      providers: [provideSpartanHlm()],
    }).compileComponents();
  });

  it('opens checkbox, radio, and submenu items', async () => {
    const fixture = TestBed.createComponent(MenuHarness);
    await fixture.whenStable();
    const open = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    open.click();
    await fixture.whenStable();

    const check = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Check'),
    );
    check?.click();
    const more = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('More'),
    );
    more?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    more?.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await fixture.whenStable();

    expect(document.body.textContent).toContain('Radio');
  });
});
