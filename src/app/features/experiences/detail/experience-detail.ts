import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-experience-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience-detail.html',
})
export class ExperienceDetail {
  readonly slug = input.required<string>();
}
