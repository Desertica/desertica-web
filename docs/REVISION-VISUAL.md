# Revisión visual de la web (27-11-2026)

Recorrido de todas las rutas de `src/app/app.routes.ts` con `npm start` (CMS y API de staging), a 1280 px y 375 px, en claro y oscuro, en `/es` y parte de `/en`. Además de mirar, se pasó un script por cada página que mide desbordes, contraste WCAG AA, claves i18n visibles, textos de relleno, tamaños de toque y controles nativos. Las reglas para corregir y no repetir estos fallos están en [`ESTANDAR-VISUAL.md`](ESTANDAR-VISUAL.md).

No se cambió ningún componente. Cada punto dice página, pantalla, qué se ve mal y el archivo probable.

**Fuera de esta revisión**: los selectores de idioma y moneda del header, la galería y el visor de fotos del tour, y la elección pago completo / adelanto del panel de reserva. Se cambiaron en paralelo y ya están en `develop` (#67, #68, #69). Los puntos marcados con ⚠ tocan `booking-panel.ts`: revisarlos sobre esa versión nueva.

**No se pudo ver**: el paso de pago (`/checkout/payment/:reference`), `/pay/:token`, `/waiver/:token` y `/booking/:reference` necesitan una reserva o un enlace reales; el detalle de blog y de productos no existe todavía (las dos páginas dicen "Próximamente").

## Lo que ya está bien

- Ninguna ruta se desborda en horizontal a 375 px.
- No hay claves i18n visibles; `en.json` y `es.json` tienen las mismas claves.
- En modo claro todo el texto pasa AA.
- Casi todos los botones usan `hlmBtn`; los campos usan `hlmField` + `hlmInput`; las fotos son de esquinas rectas en todas partes.

## Alto

| # | Página | Pantalla | Qué se ve mal | Archivo probable |
|---|---|---|---|---|
| A1 ✅ | Ficha de tour real (`/tours/dune-buggy`, `/es` y `/en`) | todas | Debajo de la descripción real aparecen dos párrafos de *Lorem ipsum*. Vienen del catálogo estático y se suman al texto del CMS. En la misma ficha, "VIDEO PRÓXIMAMENTE" en dos tarjetas vacías. **Resuelto:** el Lorem estaba copiado dentro del campo `body` del tour en Strapi (lo trajo la semilla); el mapper descarta esos párrafos, el catálogo estático y los locales ya no lo tienen (`no-filler.spec.ts` falla si vuelve), y un vídeo sin archivo ya no se muestra. Falta borrar esos dos párrafos del `body` en Strapi. | `src/locales/*.json` (`tours.duneBuggy.description.*`, `tours.duneBuggy.details.*`), `core/catalog/tour-pages.ts`, `features/tours/detail/tour-videos.ts:83` |
| A2 ✅ | `/tours/ejemplo-completo` | todas | Tour de ejemplo público: sale en el menú Tours y en los listados, todo en *Lorem ipsum*, con el título de pestaña "Desértica \| Desértica". **Resuelto en el código:** un título SEO que ya nombra la marca no la repite. La web solo pide a Strapi lo publicado, así que al despublicarlo sale del menú, los listados y el sitemap. | Contenido en Strapi (despublicarlo); título en `core/seo/seo.ts` |
| A3 ✅ | Checkout | todas | "Acepto los **política** de privacidad", "Acepto los **política** de cancelación", y falta el espacio antes de "(versión 1)". Se arma la frase con trozos sueltos que no concuerdan. **Resuelto**: una clave con la frase entera por documento (`checkout.acceptDoc.*`, el enlace va entre corchetes) y la versión aparte con su espacio (`checkout.versionNote`). | `features/booking/checkout.ts:285-297`, `es.json` `checkout.accept`/`checkout.legalDoc` (una frase completa por documento) |
| A4 ✅ | Checkout | todas | Resumen de la reserva: "1 **adultos**". El panel de reserva ya dice bien "1 adulto". **Resuelto**: adulto/adultos y niño/niños según la cantidad. | `features/booking/checkout.ts:117` |
| A5 ✅ | Ficha de tour, calendario de fecha (`/es`) | todas | Los días de la semana salen en inglés (Su Mo Tu We Th Fr Sa) con el mes en español. Nadie provee el i18n del calendario de Spartan. | `libs/ui/calendar` usa `injectBrnCalendarI18n()`; falta proveerlo por idioma en `app.config.ts` o en `features/booking/booking-panel.ts:99` ⚠ **Resuelto**: `core/i18n/calendar-i18n.ts` (días y meses con `Intl`, semana desde el lunes en español), provisto en el panel de reserva y en `tour-book.ts` (no en `app.config.ts`, que metía el calendario en el paquete inicial). Reclamaciones y checkout no usan calendario. |
| A6 ✅ | Toda la web | oscuro | Los botones principales (`bg-primary`) tienen contraste 3,35:1 (texto claro sobre oliva claro) y no llegan a AA (4,5:1): "Planifica tu viaje", "Reservar", "Enviar", "Suscribirme", "Aceptar todo"… | `src/styles.css` `.dark --primary`/`--primary-foreground` (y los mismos tokens si el CMS los define, `core/theme/cms-theme.ts`) **Resuelto**: oliva y tierra más claros con texto oscuro (6,40:1 y 5,97:1); el tema del CMS ya no puede imponer una pareja por debajo de 4,5:1. Valores en `ESTANDAR-VISUAL.md` §8. En Strapi (tema, oscuro) conviene poner `primary` `#8da16a`, `primaryForeground` `#16170c`, `ring` `#8da16a`, `tierra` `#d87b63`, `tierraForeground` `#16170c`. |
| A7 ✅ | Checkout (condiciones), Reclamaciones (5 casillas), Descargo | todas, sobre todo en oscuro | Casillas nativas `<input type="checkbox">` en vez de `hlm-checkbox`: en oscuro son cuadros blancos que no siguen el tema, tienen otra forma y miden 21-23 px. **Resuelto**: `hlm-checkbox` en las tres páginas, dentro de su etiqueta (toda la frase se puede tocar) y con el borde rojo de error. | `features/booking/checkout.ts:287`, `features/complaints/complaints.ts:100` (`CHECKBOX`), `features/waiver/waiver.ts:97,148` |
| A8 ✅ | Checkout (País, Tipo de documento), Reclamaciones (Tipo de documento, Moneda), Descargo | todas | Desplegables nativos `<select hlmInput>`: flecha del sistema pegada al borde, lista del sistema operativo y otro aspecto que el resto de selectores (panel de reserva, teléfono con bandera). **Resuelto**: `hlm-select` para tipo de documento y moneda; el país del checkout es un `hlm-combobox` con búsqueda. | `features/booking/checkout.ts:176,224`, `features/complaints/complaints.ts:181,321`, `features/waiver/waiver.ts:120` |

## Medio

| # | Página | Pantalla | Qué se ve mal | Archivo probable |
|---|---|---|---|---|
| M1 | Ficha, tarjetas, checkout | todas | El precio se escribe de cuatro formas: "DESDE $USD 45", "S/PEN", "Total: $ 45.00", "Pagar precio completo · $ 45.00". Falta un único formato de moneda. | `es.json`/`en.json` `gallery.currency*`, `features/booking/checkout.ts`, `booking-panel.ts` ⚠ |
| M2 | Ficha de tour | todas | "DESDE"/"FROM" están en mayúsculas dentro del texto traducido (deberían serlo por CSS). Si falla la disponibilidad, el panel muestra "DESDE" sin precio. | `es.json` `gallery.from`, `features/booking/booking-panel.ts:70` ⚠ |
| M3 | Todas las páginas | 1280 px | El título principal (h1) cambia de tamaño sin motivo entre páginas del mismo tipo: portada 54 px, Tours/Nosotros/Blog 51 px, Productos 67 px (mismo "Próximamente" que Blog), contenido/contacto/reclamaciones/404 40 px, carrito/checkout/mi reserva 34 px. | `features/*/` (cada `<h1>`); usar la escala de `ESTANDAR-VISUAL.md` |
| M4 ✅ | Contacto, Reclamaciones vs Checkout | todas | Los obligatorios se marcan con "*" rojo en Contacto y Reclamaciones y con "(opcional)" en el resto en Checkout. **Resuelto** con el criterio del dueño (estándar §6): `*` en terracota tras cada obligatorio, sin "(opcional)" y la línea "Los campos con * son obligatorios." al inicio de contacto, reclamaciones, checkout y descargo. La dirección del checkout lleva `*` solo con factura. | `features/contact/contact.html`, `features/complaints/complaints.ts`, `features/booking/checkout.ts` |
| M5 ✅ | Checkout vs Contacto | todas | El teléfono en Contacto y Reclamaciones lleva selector de país con bandera; en Checkout es un campo simple. En Contacto (375 px) el botón del país mide 23 px de alto. **Resuelto**: el selector de país es ahora un componente (`features/contact/phone-country.ts`) que usan contacto, reclamaciones y checkout; el botón mide 36 px en móvil. El teléfono del checkout se valida por país y se envía en formato internacional. | `features/booking/checkout.ts`, `features/contact/phone.ts` |
| M6 | Ficha de tour | todas | "Descargar itinerario" es un botón lleno (principal) a todo el ancho justo debajo de la reserva y compite con "Reservar". Debe ser `outline`. | `features/tours/detail/tour-detail.html` |
| M7 ✅ | Checkout | 375 px | "Crear mi reserva" y "Cambiar mi selección" no ocupan todo el ancho (en el panel de reserva sí). El enlace "Libro de Reclamaciones" queda suelto entre el captcha y los botones. **Resuelto**: los dos botones a todo el ancho en móvil y el enlace al Libro de Reclamaciones al final del bloque "Condiciones". | `features/booking/checkout.ts` |
| M8 | Panel de reserva | todas | El texto de ejemplo del campo "Fecha" repite la etiqueta "Fecha"; hay un hueco grande fijo entre Fecha y Personas; en el calendario los días con salida solo se distinguen por un gris más oscuro. | `features/booking/booking-panel.ts` ⚠ |
| M9 | Todas | 375 px | El aviso de cookies tapa más de la mitad de la pantalla al entrar. | `core/layout/cookie-banner.ts` |
| M10 | Todas | 375 px | El botón flotante de WhatsApp tapa texto y el borde del botón "Reservar"; no se reserva espacio al final de la página. | `core/layout/whatsapp-fab.ts` |
| M11 ✅ | Checkout, condiciones | todas | "Hasta 0 horas antes del tour: reembolso de 0%" se lee mal. Mejor "Menos de 24 horas antes: sin reembolso". **Resuelto**: "Con 24 horas o más de anticipación: reembolso total" / "Menos de 24 horas antes: sin reembolso" (`cancellationTierLines` en `core/booking/format.ts`, también en "Mi reserva"). | `es.json`/`en.json` `checkout.tier`, `features/booking/checkout.ts` |
| M12 | Ficha de tour, "Detalles" | todas | Títulos repetidos: "Incluido" dos veces seguidas; "Condiciones de reserva" es a la vez el título del acordeón y el enlace. | `features/tours/detail/tour-full-details.ts:65-69,103-107` |
| M13 | Portada, Tours, Nosotros, Blog, Productos, tarjetas | todas | El degradado oscuro sobre fotos está copiado en 6 CSS con oscuridad distinta (0,5 / 0,55 / 0,62) y `#fff` a mano. | `core/layout/tour-card.css`, `core/layout/photo-cta.css`, `features/{landing,tours,about,blog,products}/*.css` |
| M14 | Productos, Blog, menú móvil | todas | Botones hechos a mano (`bg-primary … h-10 rounded-4xl px-5`) y enlaces del menú móvil con clases propias en vez de `hlmBtn`. | `features/products/products.html`, `features/blog/blog.html`, `core/layout/site-header.ts:223-278` |
| M15 ✅ | Checkout y panel | todas | La misma elección se llama "Reserva ahora, paga después" en el panel y "Pagar un depósito ahora" en el checkout. **Resuelto**: `checkout.payDeposit` dice "Reserva ahora, paga después" / "Book now, pay later", como el panel. | `es.json` `checkout.payDeposit` ⚠ (lo lleva la sesión de pago) |

## Bajo

| # | Página | Pantalla | Qué se ve mal | Archivo probable |
|---|---|---|---|---|
| B1 | Pie, menú móvil, migas de la ficha | teclado | Enlaces sin `focus-visible` propio: dependen del contorno por defecto a 50 % de opacidad (`outline-ring/50`), poco visible. | `core/layout/site-footer.html`, `core/layout/site-header.ts`, `features/tours/detail/tour-heading.ts` |
| B2 | Contacto, Reclamaciones | todas | Las banderas vienen de `flagcdn.com` y no pasan por `/_img`; la bandera del selector sale levemente estirada (`h-5 w-auto`). | `features/contact/phone.ts` |
| B3 | Ficha de tour, Contacto | todas | Fotos de staging que no son del desierto (calle con neón en "Dunas" y en Contacto, Monument Valley en "Tabla"). Es contenido del CMS. | Strapi |
| B4 | Panel de reserva, Checkout | oscuro | El captcha de Cloudflare se ve claro sobre fondo oscuro y con ancho fijo (con la clave de pruebas; revisar con la real). | `core/forms/turnstile.ts` |
| B5 | Ficha de tour | — | El mismo tour se llama "Paseo en Buggy & Sandboarding" en español y "Dune buggy" en inglés. | Strapi |
| B6 | Tarjetas de tour | todas | El título usa `clamp()` y sale en tamaños fuera de escala (19,55 px); varias etiquetas usan `tracking-[0.22em]` a mano. | `core/layout/tour-card.css`, `core/layout/tour-card.ts` |
| B7 | Portada y Tours | todas | Las tarjetas de tour no muestran "Desde" ni precio en staging. Revisar si falta el dato o si es a propósito. | `core/layout/tour-card.ts`, `core/catalog/tour-prices` |
