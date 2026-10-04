import { Pipe, PipeTransform, inject } from '@angular/core';
import { type AppLocale, translate } from './catalogs';
import { I18nService } from './i18n';

@Pipe({
  name: 'translate',
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, locale: AppLocale): string {
    return translate(key, locale, this.i18n.overlay);
  }
}
