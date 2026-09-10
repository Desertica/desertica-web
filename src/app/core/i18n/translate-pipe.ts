import { Pipe, PipeTransform } from '@angular/core';
import { type AppLocale, translate } from './catalogs';

@Pipe({
  name: 'translate',
})
export class TranslatePipe implements PipeTransform {
  transform(key: string, locale: AppLocale): string {
    return translate(key, locale);
  }
}
