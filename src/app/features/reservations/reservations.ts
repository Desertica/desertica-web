import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCalendarImports } from '@spartan-ng/helm/calendar';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { ExperiencesService } from '../../core/services/experiences';

@Component({
  selector: 'app-reservations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmCalendarImports,
    HlmCardImports,
    HlmFieldImports,
    HlmInputImports,
    HlmSelectImports,
  ],
  templateUrl: './reservations.html',
})
export class Reservations implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly experiences = inject(ExperiencesService);

  protected readonly catalog = this.experiences.list();
  protected readonly minDate = new Date();
  protected readonly guestOptions = [1, 2, 3, 4, 5, 6, 7, 8];

  protected readonly form = this.fb.nonNullable.group({
    experienceSlug: ['', Validators.required],
    date: this.fb.control<Date | null>(null, Validators.required),
    guests: [2, Validators.required],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    const fromQuery = this.route.snapshot.queryParamMap.get('experience');
    if (fromQuery && this.experiences.getBySlug(fromQuery)) {
      this.form.controls.experienceSlug.setValue(fromQuery);
    }
  }

  protected onDateChange(date: Date): void {
    this.form.controls.date.setValue(date);
    this.form.controls.date.markAsTouched();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      toast.error('Check the form and try again.');
      return;
    }

    const value = this.form.getRawValue();
    const experience = this.experiences.getBySlug(value.experienceSlug);
    toast.success(`Request received for ${experience?.name ?? 'your experience'}.`, {
      description: 'This is a client-side demo — no payment is collected yet.',
    });
    this.form.reset({ guests: 2, experienceSlug: value.experienceSlug });
  }
}
