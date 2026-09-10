import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-reservations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reservations.html',
})
export class Reservations {}
