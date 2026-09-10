import { TestBed } from '@angular/core/testing';
import { ExperiencesService } from './experiences';

describe('ExperiencesService', () => {
  let service: ExperiencesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExperiencesService);
  });

  it('returns an empty catalog until data is added', () => {
    expect(service.list()).toEqual([]);
  });

  it('returns undefined for any slug', () => {
    expect(service.getBySlug('placeholder')).toBeUndefined();
  });
});
