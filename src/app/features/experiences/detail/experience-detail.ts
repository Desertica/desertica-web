import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { ExperiencesService } from '../../../core/services/experiences';

@Component({
  selector: 'app-experience-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgOptimizedImage,
    RouterLink,
    HlmButtonImports,
    HlmBadgeImports,
    HlmSeparatorImports,
    HlmCardImports,
  ],
  templateUrl: './experience-detail.html',
})
export class ExperienceDetail {
  private readonly experiences = inject(ExperiencesService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly slug = input.required<string>();

  protected readonly experience = computed(() => this.experiences.getBySlug(this.slug()));

  constructor() {
    effect(() => {
      const found = this.experience();
      if (found) {
        this.title.setTitle(`${found.name} · Desertica`);
        this.meta.updateTag({ name: 'description', content: found.summary });
        return;
      }
      this.title.setTitle('Experience not found · Desertica');
    });
  }
}
