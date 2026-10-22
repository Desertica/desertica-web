import { vi } from 'vitest';
import type { TestBed as TestBedType } from '@angular/core/testing';
import { CatalogService } from '../core/catalog/catalog';

/** The bundled site settings hold placeholders (no WhatsApp link), so specs that need the channel give it a real number. */
export function stubWhatsapp(testBed: typeof TestBedType): void {
  vi.spyOn(testBed.inject(CatalogService), 'contact').mockReturnValue({
    email: null,
    phone: null,
    mailto: null,
    tel: null,
    whatsapp: 'https://wa.me/51987654321',
  });
}
