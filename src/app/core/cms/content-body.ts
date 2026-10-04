import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import { renderMarkdown } from './markdown';

@Component({
  selector: 'app-content-body',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './content-body.css',
  host: { class: 'content-body block' },
  template: `@if (html()) {
    <div [innerHTML]="html()"></div>
  }`,
})
export class ContentBody {
  readonly markdown = input<string | null | undefined>('');
  protected readonly html = computed(() => renderMarkdown(this.markdown()));
}
