import { Injectable } from '@angular/core';
import { Experience } from '../models/experience';

@Injectable({ providedIn: 'root' })
export class ExperiencesService {
  list(): readonly Experience[] {
    return [];
  }

  getBySlug(_slug: string): Experience | undefined {
    return undefined;
  }
}
