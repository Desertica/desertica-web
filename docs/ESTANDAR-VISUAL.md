# Estándar visual de Desértica

Esta es la regla para cualquier cambio de interfaz: páginas, componentes, estilos y textos que se ven. Sale de lo que la web ya hace bien (tokens de `src/styles.css`, componentes de `libs/ui`, patrones repetidos). Si algo no está aquí, se resuelve con lo más parecido que ya existe y se añade a este documento en el mismo cambio. Los fallos que hoy incumplen la regla están en [`REVISION-VISUAL.md`](REVISION-VISUAL.md).

Al final hay una [lista de verificación](#lista-de-verificación) que se pasa antes de subir cualquier cambio que toque la interfaz.

## 1. Colores: solo tokens

Los colores viven como variables en `src/styles.css` (`:root` para claro, `.dark` para oscuro) y el CMS puede sobrescribirlas (`core/theme/cms-theme.ts`). En componentes se usan **solo** a través de sus clases de Tailwind:

| Token | Para qué | Clases |
|---|---|---|
| `background` / `foreground` | Fondo de página y texto normal | `bg-background`, `text-foreground` |
| `card` / `card-foreground` | Tarjetas y paneles (`hlmCard`) | `bg-card`, `text-card-foreground` |
| `popover` / `popover-foreground` | Menús, calendario, aviso de cookies | `bg-popover`, `text-popover-foreground` |
| `primary` / `primary-foreground` | Acción principal, selección activa | `bg-primary`, `text-primary-foreground`, `text-primary` |
| `secondary`, `muted`, `accent` (+ `-foreground`) | Fondos suaves, bloques de apoyo, hover | `bg-muted`, `bg-secondary`, `hover:bg-muted` |
| `muted-foreground` | Texto secundario (notas, bajadas, metadatos) | `text-muted-foreground` |
| `destructive` | Errores y acciones de borrar | `text-destructive`, `variant="destructive"` |
| `border`, `input`, `ring` | Bordes, fondo de campos, foco | `border-border`, `bg-input/50`, `ring-ring/30` |
| `tierra`, `arena` (+ `-foreground`) | Acentos de marca | `bg-tierra text-tierra-foreground`, `bg-arena text-arena-foreground` |

Reglas:

- **Prohibido** escribir colores sueltos en componentes y CSS de páginas: nada de `#fff`, `rgb(...)`, `oklch(...)` ni de la paleta de Tailwind (`text-white`, `bg-black/60`, `bg-amber-400`, `text-gray-500`…).
- Cada fondo va con su pareja de texto: `bg-primary` con `text-primary-foreground`, `bg-card` con `text-card-foreground`, etc.
- Se permite opacidad sobre un token (`hover:bg-primary/80`, `bg-input/50`, `ring-ring/30`), no inventar tonos nuevos.
- ¿Hace falta un color nuevo? Se añade como token en `:root` **y** en `.dark` de `src/styles.css`, con su campo en el tema del CMS (ver `CLAUDE.md`, "Everything editable belongs in Strapi").
- Excepciones conocidas, y ninguna más: el verde de marca de WhatsApp en `core/layout/whatsapp-fab.ts`; el texto blanco y el degradado oscuro **sobre fotos** (ver §9), que deben salir de una sola clase compartida y no copiarse en cada CSS.

## 2. Tipografía

Una sola familia, Radio Canada (`font-sans`; `font-heading` es la misma en peso 700). El tamaño base lo fija `html` (17 px en móvil, 18 px desde 640 px): no se toca, todo lo demás es relativo a él.

| Uso | Clases |
|---|---|
| Título de página (`h1`) | `font-heading text-4xl text-balance sm:text-5xl` |
| Título de portada o de cabecera con foto | `font-heading text-4xl text-balance sm:text-6xl` |
| Título de sección (`h2`) | `font-heading text-2xl text-balance sm:text-3xl` |
| Subtítulo, título de tarjeta o bloque (`h3`) | `font-heading text-xl` |
| Bajada bajo un título | `text-lg text-muted-foreground` |
| Texto corrido | `text-base` (por defecto) |
| Interfaz: etiquetas, botones, campos, notas, pie | `text-sm` |
| Antetítulo o dato corto (horas, "Desde") | `text-xs font-medium tracking-wide uppercase` |

Reglas:

- Solo esos tamaños. Nada de `text-[13px]`, `text-[0.65rem]` ni `font-size: clamp(...)` en CSS.
- Pesos: normal, `font-medium` (etiquetas, botones, enlaces de navegación) y `font-heading` (títulos). Nada de `font-bold` o `font-semibold` sueltos.
- Mayúsculas siempre con la clase `uppercase`, nunca escritas en el texto traducido ("DESDE" debe ser "Desde" + `uppercase`).
- Espaciado de letras: `tracking-wide` o `tracking-tight`; nada de `tracking-[0.22em]`.
- Un solo `h1` por página y títulos en orden (`h1` → `h2` → `h3`).

## 3. Espaciado y maquetación

Solo la escala de Tailwind (múltiplos de 4 px: `gap-3`, `p-5`, `py-12`…). Valores entre corchetes solo para alturas ligadas a la cabecera (`min-h-[calc(100svh-var(--header-h))]`) y proporciones de foto (§9).

| Qué | Clases |
|---|---|
| Contenedor de páginas y listados | `mx-auto max-w-6xl px-4 sm:px-6` |
| Contenedor de texto y formularios | `mx-auto max-w-3xl px-4 sm:px-6` (formularios cortos: `max-w-2xl`) |
| Estado centrado (vacío, 404, gracias) | `mx-auto max-w-md px-4 py-12 text-center` |
| Margen vertical de página de texto o formulario | `py-12` |
| Margen vertical de sección (portada, nosotros) | `py-16 sm:py-20` |
| Entre bloques de un formulario | `gap-6` en el contenedor del formulario |
| Dentro de un campo (etiqueta, control, error) | lo que trae `hlmField` |
| Relleno de tarjeta o panel | `p-5` (compacto: `p-4`) |
| Rejilla de tarjetas / de fotos | `gap-6` / `gap-3` |

Elementos del mismo tipo llevan el mismo espaciado en todas las páginas. Si dos formularios separan sus campos distinto, uno está mal.

## 4. Radios (esquinas)

| Elemento | Radio |
|---|---|
| Botones, tarjetas (`hlmCard`), insignias | `rounded-4xl` (ya viene en `libs/ui`) |
| Campos, selects, disparadores de menú o calendario, ítems de menú, paneles con borde | `rounded-3xl` (ya viene en `libs/ui`; panel: `border-border rounded-3xl border p-5`) |
| Botones de icono, botón flotante, puntos, avatares | `rounded-full` |
| Fotos y vídeos | `rounded-none`: esquinas rectas siempre |

Nada de `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` o `rounded-2xl` sueltos. Las casillas usan lo que trae `hlm-checkbox`.

## 5. Botones

Siempre `hlmBtn` sobre `<button>` o `<a>`. Nunca un botón hecho a mano con `bg-primary … h-10 rounded-4xl px-5`.

| Variante | Cuándo |
|---|---|
| `default` | La acción principal. **Una sola** por pantalla o bloque ("Reservar", "Crear mi reserva", "Enviar"). |
| `outline` | Acción secundaria al lado de la principal ("Agregar al carrito", "Cambiar mi selección", "Descargar itinerario", "Consultar por WhatsApp"). |
| `secondary` | Acción terciaria sobre fondo de color, o botón sobre foto. |
| `ghost` | Acciones de barra: cabecera, cerrar, menú. |
| `link` | Acción dentro de un texto. |
| `destructive` | Borrar, quitar del carrito, cancelar una reserva. |

Tamaños: `size="default"` (36 px) normal, `sm` (32 px) solo en barras densas, `lg` (40 px) para la acción principal de una página o un formulario. En móvil la acción principal de un formulario o panel va a todo el ancho (`class="w-full sm:w-auto"`), y la secundaria igual debajo.

**Botones de icono**: siempre `size="icon"`, `icon-sm` o `icon-lg`, que son cuadrados de tamaño fijo y salen redondos. Nunca con `px-*`/`py-*` ni ancho propio (así salen ovalados). Siempre con `aria-label` traducido.

```html
<button hlmBtn variant="ghost" size="icon" type="button" [attr.aria-label]="'a11y.closeMenu' | translate: i18n.locale()">
  <ng-icon name="lucideX" />
</button>
```

Mientras una acción carga: el botón queda `[disabled]`, cambia su texto a la forma "…ndo" ("Creando tu reserva…") y no se quita de la pantalla.

## 6. Formularios y selecciones

Estructura fija, como en Contacto y Checkout:

```html
<div hlmField>
  <label hlmFieldLabel for="c-email">{{ 'checkout.email' | translate: i18n.locale() }}</label>
  <input hlmInput id="c-email" type="email" autocomplete="email" formControlName="email" />
  <hlm-field-error>{{ 'checkout.errorEmail' | translate: i18n.locale() }}</hlm-field-error>
</div>
```

Grupos de opciones van en `<fieldset hlmFieldSet>` con `<legend hlmFieldLegend>`.

Qué control usar:

| Necesidad | Control (`libs/ui`) |
|---|---|
| Texto de una línea / varias | `hlmInput` / `hlmTextarea` |
| Teléfono | el componente de `features/contact/phone.ts` (país con bandera + número), en todos los formularios |
| Elegir 1 de **2 o 3** opciones cortas (Grupo/Privado, ES/EN, USD/PEN) | **segmentado**: `hlm-toggle-group` de selección única |
| Elegir 1 de 2 a 4 opciones con descripción o precio | `hlm-radio-group` (la tarjeta entera es el radio, ver abajo) |
| Elegir 1 de 5 o más | select de `libs/ui/select` |
| Lista larga que conviene buscar (países) | `hlm-combobox` |
| Activar/desactivar algo que se aplica al momento (preferencias) | `hlm-switch` |
| Aceptar condiciones o marcar varias cosas | `hlm-checkbox` |
| Fecha | `hlm-calendar` en popover, con el idioma de la página |
| Cantidad (personas) | botones `size="icon-sm" variant="outline"` con el número en medio (patrón de `tour-book.ts`) |

Reglas:

- **Prohibido** `<input type="checkbox">`, `<input type="radio">` y `<select>` nativos: no siguen el modo oscuro ni el resto de la web.
- **Un control que parece elegible debe serlo.** Una tarjeta con borde, fondo, hover o puntero es un radio, casilla o segmento real (con `role`, teclado y estado `aria-checked`/`aria-pressed`). Si solo informa, no lleva hover, ni puntero, ni aspecto de seleccionado.
- La opción elegida se ve sin ambigüedad: `bg-primary text-primary-foreground` o borde `border-primary` más el indicador del control.
  - Excepción: los selectores de idioma y moneda de la cabecera (`core/layout/locale-switcher.ts`, `currency-switcher.ts`) son texto como los enlaces del menú (elegida en `text-tierra` y `font-semibold` con una raya fina `bg-tierra` debajo, el resto en `text-muted-foreground`), para que el CTA sea lo único verde de la cabecera.
- Obligatorios y opcionales: todos los campos son obligatorios salvo que la etiqueta diga "(opcional)". Sin asteriscos.
- El texto de ejemplo (`placeholder`) muestra un ejemplo ("987 654 321", "¿Qué tienes pensado?") y nunca repite la etiqueta.
- Errores debajo del campo con `<hlm-field-error>`, en `text-destructive`, después de tocar el campo o enviar. Un error de todo el formulario va en un `<p role="alert">` encima de los botones.

## 7. Estados obligatorios

Todo lo que se puede tocar tiene estos estados. Los componentes de `libs/ui` ya los traen; lo hecho a mano debe copiarlos.

| Estado | Cómo |
|---|---|
| Hover | `hover:bg-muted` (ítems), `hover:bg-primary/80` (principal), `hover:text-foreground` (enlaces en gris) |
| Foco con teclado | `focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:border-ring` (como `hlmBtn` e `hlmInput`); en enlaces de texto `focus-visible:underline` además del anillo. Nunca `outline-none` sin un anillo a cambio. |
| Desactivado | atributo `disabled`; se ve con `disabled:opacity-50` y no reacciona. Debe quedar claro por qué (texto de ayuda cerca). |
| Cargando | botón desactivado con texto "…ndo"; contenido que llega con `hlm-skeleton` del mismo tamaño que lo que va a mostrar. |
| Error | campo con borde y anillo `destructive` (lo pone `hlmInput` al ser inválido) y mensaje debajo. |
| Vacío | frase que explica y una acción (carrito vacío → "Ver tours"). |
| Seleccionado | estado del control (`aria-checked`, `aria-pressed`, `aria-current="page"` en navegación) y su estilo. |

## 8. Contraste (WCAG AA)

- Texto normal: 4,5:1 contra su fondo. Texto grande (24 px o más, o 18,7 px en negrita): 3:1. Bordes de campos e iconos que se pueden tocar: 3:1.
- Las parejas de tokens (`bg-X` + `text-X-foreground`) deben cumplir en claro **y** en oscuro. Quien cambie un token en `styles.css` o en el tema del CMS lo comprueba en los dos modos.
- `text-muted-foreground` solo sobre `background`, `card` o `muted`, nunca sobre fotos ni sobre `primary`.
- Texto sobre fotos solo con el degradado oscuro compartido (§9).
- En oscuro, `primary` y `tierra` son tonos claros con texto oscuro (`*-foreground` = el fondo de la página), no texto claro sobre color medio: así pasan AA y siguen leyéndose como texto sobre el fondo.
- El tema del CMS no puede romper una pareja: `core/theme/cms-theme.ts` descarta del CMS cualquier pareja `X` / `X-foreground` en hex por debajo de 4,5:1 y deja la de `styles.css`.

Valores medidos (27-11-2026), fondo / texto:

| Pareja | Claro (CMS) | Oscuro (`styles.css`) | Oscuro, hex para el CMS |
|---|---|---|---|
| `primary` / `primary-foreground` | 5,49 | 6,40 (4,52 en hover `/80`) | `#8da16a` / `#16170c` |
| `tierra` / `tierra-foreground` | 5,26 | 5,97 | `#d87b63` / `#16170c` |
| `arena` / `arena-foreground` | — | 8,45 | sin cambio |
| `accent` / `accent-foreground` | — | 12,11 | sin cambio |
| `muted` / `muted-foreground` | 5,13 | 7,50 | sin cambio |
| `muted-foreground` sobre `background` / `card` | — | 9,96 / 8,79 | sin cambio |
| `destructive` sobre `background` / `card` | 4,49 ⚠ (falla por poco; pendiente, fuera de A6) | 6,25 / 5,52 | sin cambio |
| `primary` como texto sobre `background` / `card` | — | 6,40 / 5,64 | — |
| `tierra` como texto sobre `background` / `card` | — | 5,97 / 5,25 | — |

Antes, en oscuro: `primary` 3,35:1 y `tierra` 3,58:1 (texto claro sobre color medio).

## 9. Imágenes

- Imágenes del CMS con `<img [ngSrc]>` (`NgOptimizedImage`) con `width`, `height` y `sizes`: el cargador de `core/images/remote-image-loader.ts` las manda por `/_img` (WebP al ancho justo). Nunca `<img src>` directo a otro dominio; un dominio nuevo va en `IMAGE_HOSTS`.
- En `public/` solo van logos, sellos legales y marcas de pago.
- Proporción fija siempre, con `object-cover` y el punto de foco del CMS (`[style.object-position]="tour().imageFocus"`):
  - `aspect-square`: tarjetas de tour y pasos del día
  - `aspect-[16/10]`: galería de la ficha
  - `aspect-[4/3]`: fotos dentro de texto
  - `aspect-[9/16]`: vídeos verticales
  - Cabeceras con foto: altura fija con `h-[min(50svh,28rem)]` o similar ya existente
- Esquinas rectas (`rounded-none`).
- Texto encima de una foto: blanco sobre el degradado oscuro compartido, nunca copiado en el CSS de cada página.
- `alt` con la descripción que da el CMS; `alt=""` solo si la foto es decorativa y el texto de al lado ya dice lo mismo.

## 10. Textos

- Todo texto visible sale de `src/locales/es.json` **y** `en.json` (o del CMS) con el pipe `translate`. Nada de texto fijo en plantillas ni en TypeScript, ni siquiera "Tours", "Total" o "WhatsApp".
- Frases completas por clave. No se arma una frase con trozos ("Acepto los" + "política de privacidad"): se crea `checkout.acceptPrivacy` con la frase entera, así concuerdan género y número en cada idioma.
- Plurales con dos claves (`tour.adult` / `tour.adults`) y se elige por cantidad. Nunca "1 adultos".
- Precios con un único formato en toda la web (símbolo, código y decimales iguales en ficha, tarjetas, carrito y checkout). Fechas y horas con `Intl` en el idioma de la página; el calendario también.
- Nota al pie de precio: cada importe al que se refiere lleva un `*` pegado (`<span aria-hidden="true">*</span>`) y la nota va debajo como `<p class="text-muted-foreground text-xs" id="…-tax-note">` que empieza por `<span aria-hidden="true">* </span>` seguido de `booking.taxIncluded` ("Precios con impuestos incluidos.", editable en el CMS sin el asterisco); el grupo de importes la enlaza con `aria-describedby`. Igual en ficha y carrito.
- Nada de *Lorem ipsum*, "XXXX", "undefined" ni "PRÓXIMAMENTE" de relleno en contenido publicado. Los datos de contacto en `XXXX` se ocultan (ya lo hace el código).
- Mismo nombre para lo mismo en toda la web: si el panel dice "Reserva ahora, paga después", el checkout no dice "Pagar un depósito ahora".

## 11. Modo oscuro

- Solo tokens: si un componente usa solo tokens, el modo oscuro sale solo. `bg-white`, `text-black` y controles nativos lo rompen.
- Todo cambio se mira también en oscuro (botón de luna en la cabecera, o `document.documentElement.classList.add('dark')`).
- Las fotos no se oscurecen ni invierten. Los widgets de terceros (captcha) se piden en el tema actual cuando lo permiten.

## 12. Móvil primero (375 px)

- Se diseña primero a 375 px y se añade lo de pantallas grandes con `sm:`, `md:`, `lg:`.
- Nada se sale en horizontal a 375 px (el script de la revisión mide `scrollWidth`).
- Zona de toque mínima de 36 px (botón `default`) para acciones; 24 px absoluto para cualquier cosa que se toque.
- Acción principal de formularios y paneles a todo el ancho en móvil.
- Lo flotante (WhatsApp, aviso de cookies) no tapa acciones ni texto: la página deja espacio abajo y el aviso de cookies no pasa de un tercio de la pantalla.

## 13. Piezas que ya existen (reusar antes de crear)

| Pieza | Dónde |
|---|---|
| Tarjeta de tour (foto cuadrada, degradado, título en mayúsculas, "Desde") | `core/layout/tour-card.ts` |
| Llamada con foto | `core/layout/photo-cta.ts` |
| Tarjeta o panel | `hlmCard` + `hlmCardContent` / `border-border rounded-3xl border p-5` |
| Bloque de beneficios con iconos | `features/tours/detail/tour-assurances.ts` |
| Detalles plegables | `hlm-accordion` (`tour-full-details.ts`) |
| Insignia (ubicación, etiqueta) | `hlmBadge` |
| Selector de cantidad | `features/tours/detail/tour-book.ts` |
| Teléfono con país | `features/contact/phone.ts` |
| Iconos | `ng-icon` de `@ng-icons/lucide`, a `size-4` dentro de botones (lo pone `hlmBtn`) |

Un patrón nuevo se construye con `libs/ui` y, si se repite, se convierte en componente en `core/layout`.

## Lista de verificación

Pásala antes de subir (commit y push) cualquier cambio visible.

- [ ] Sin colores sueltos: solo clases de tokens (§1).
- [ ] Tamaños de letra, espaciados y radios de las tablas (§2-§4); nada entre corchetes salvo las excepciones.
- [ ] Botones con `hlmBtn`, una sola acción principal por bloque, botones de icono con `size="icon*"` y `aria-label` (§5).
- [ ] Controles de `libs/ui`, ninguno nativo; lo que parece elegible se puede elegir (§6).
- [ ] Hover, foco con teclado (probado con Tab), desactivado, cargando y error (§7).
- [ ] Contraste AA en claro y en oscuro (§8).
- [ ] Imágenes con `ngSrc`, proporción fija y `alt` (§9).
- [ ] Todo texto en `es.json` y `en.json`, frases completas, plurales bien, sin relleno (§10).
- [ ] Mirado a 375 px y a 1280 px, en claro y en oscuro, en `/es` y en `/en` (§11-§12).
- [ ] Nada se desborda a 375 px y lo flotante no tapa acciones (§12).
- [ ] Si se añadió un patrón o una excepción, está en este documento.
