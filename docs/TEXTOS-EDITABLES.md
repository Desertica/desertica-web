# Textos editables desde el CMS

Decisión sobre las 178 claves de `src/locales/{en,es}.json` que antes eran solo de código (flujo de reserva, pago, Mi reserva, Libro de Reclamaciones y renuncia). Las demás claves del sitio ya eran editables en la colección `translation` del CMS (Textos), salvo las de tours y destinos, que viven en sus propios campos.

**Criterio.** Editable: prosa comercial o legal que un socio querría reescribir (descripciones del flujo, mensajes de confirmación, avisos legales). Código: mensajes de validación y error ligados al API, etiquetas de campo y botón, accesibilidad, nombres de formatos, pasarelas y enumeraciones, y plantillas con marcadores técnicos. En la duda, código.

**Resultado: 18 editables, 160 en código (total 178).**

| Prefijo | Editables | Código |
| --- | --- | --- |
| `booking.*` | 5 | 18 |
| `checkout.*` | 4 | 43 |
| `payment.*` | 4 | 27 |
| `myBooking.*` | 1 | 25 |
| `complaints.*` | 3 | 27 |
| `waiver.*` | 1 | 20 |

Las editables entran al seed (`seed/catalog.json` del CMS) como filas de `translation`: `booking.*` y `checkout.*`/`payment.*`/`myBooking.*` en la página *booking* (secciones `flow`, `checkout`, `payment`, `my-booking`) y `complaints.*`/`waiver.*` en *legal* (secciones `complaints`, `waiver`). La lista vive en `EDITABLE_FROM_CODE_ONLY` de `scripts/build-cms-seed.mjs`; para cambiar una decisión se edita ahí, se actualiza esta tabla y se regenera con `npm run cms:seed`.

| Clave | Decisión | Motivo |
| --- | --- | --- |
| `booking.title` | editable | Título del flujo de reserva, texto de marca |
| `booking.lead` | editable | Descripción comercial del flujo de reserva |
| `booking.currency` | codigo | Etiqueta de botón/campo de interfaz |
| `booking.loading` | codigo | Texto de estado de carga |
| `booking.loadError` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `booking.retry` | codigo | Etiqueta de botón/campo de interfaz |
| `booking.noAvailability` | editable | Mensaje a clientes sin fechas: los socios querrán orientarlo |
| `booking.departures` | codigo | Etiqueta de botón/campo de interfaz |
| `booking.seatsLeft` | codigo | Fragmento de frase o plantilla con marcadores técnicos |
| `booking.perPerson` | codigo | Etiqueta de botón/campo de interfaz |
| `booking.perGroup` | codigo | Etiqueta de botón/campo de interfaz |
| `booking.fewer` | codigo | Etiqueta de control/accesibilidad |
| `booking.more` | codigo | Etiqueta de control/accesibilidad |
| `booking.total` | codigo | Etiqueta de botón/campo de interfaz |
| `booking.deposit` | codigo | Etiqueta de botón/campo de interfaz |
| `booking.taxIncluded` | editable | Aviso de precios con impuestos, redacción comercial |
| `booking.quoteError` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `booking.continue` | codigo | Etiqueta de botón/campo de interfaz |
| `booking.holding` | codigo | Texto de estado de carga |
| `booking.holdNote` | editable | Explica la reserva temporal de cupos; el plazo lo pueden reformular |
| `booking.errorSeats` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `booking.errorBusy` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `booking.errorGeneric` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `checkout.title` | editable | Título de la página de pago |
| `checkout.empty` | editable | Mensaje de bienvenida cuando no hay reserva en curso |
| `checkout.holdLeft` | codigo | Fragmento de frase o plantilla con marcadores técnicos |
| `checkout.expired` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `checkout.chooseAgain` | codigo | Etiqueta de botón/campo de interfaz |
| `checkout.customer` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.firstName` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.lastName` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.email` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.phone` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.country` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.passengers` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.passengersLead` | editable | Descripción del paso de pasajeros |
| `checkout.passenger` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.billing` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.billingLead` | editable | Descripción del paso de comprobante |
| `checkout.boleta` | codigo | Término fiscal fijo (SUNAT) |
| `checkout.factura` | codigo | Término fiscal fijo (SUNAT) |
| `checkout.docType` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.docNumber` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.billingName` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.address` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.doc.DNI` | codigo | Nombre de documento/tipo de identificación (formato) |
| `checkout.doc.CE` | codigo | Nombre de documento/tipo de identificación (formato) |
| `checkout.doc.PASSPORT` | codigo | Nombre de documento/tipo de identificación (formato) |
| `checkout.doc.RUC` | codigo | Nombre de documento/tipo de identificación (formato) |
| `checkout.payment` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.payDeposit` | codigo | Etiqueta de botón/campo de interfaz |
| `checkout.notes` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.legal` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.accept` | codigo | Fragmento de frase o plantilla con marcadores técnicos |
| `checkout.version` | codigo | Fragmento de frase o plantilla con marcadores técnicos |
| `checkout.legalDoc.TERMS` | codigo | Nombre de documento/tipo de identificación (formato) |
| `checkout.legalDoc.PRIVACY` | codigo | Nombre de documento/tipo de identificación (formato) |
| `checkout.legalDoc.CANCELLATION` | codigo | Nombre de documento/tipo de identificación (formato) |
| `checkout.legalError` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `checkout.tier` | codigo | Fragmento de frase o plantilla con marcadores técnicos |
| `checkout.complaints` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `checkout.submit` | codigo | Etiqueta de botón/campo de interfaz |
| `checkout.sending` | codigo | Texto de estado de carga |
| `checkout.errorRequired` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `checkout.errorEmail` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `checkout.errorDocument` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `checkout.errorAccept` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `checkout.errorSeats` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `checkout.errorInvalid` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `checkout.errorGeneric` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.title` | codigo | Etiqueta de botón/campo de interfaz |
| `payment.missing` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.gateway` | codigo | Etiqueta de botón/campo de interfaz |
| `payment.provider.STRIPE` | codigo | Nombre de pasarela/medio de pago |
| `payment.provider.CULQI` | codigo | Nombre de pasarela/medio de pago |
| `payment.kind.FULL` | codigo | Valor de enumeración del API (tipo de pago) |
| `payment.kind.DEPOSIT` | codigo | Valor de enumeración del API (tipo de pago) |
| `payment.kind.BALANCE` | codigo | Valor de enumeración del API (tipo de pago) |
| `payment.continue` | codigo | Etiqueta de botón/campo de interfaz |
| `payment.noOptions` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.viewBooking` | codigo | Etiqueta de botón/campo de interfaz |
| `payment.pay` | codigo | Etiqueta de botón/campo de interfaz |
| `payment.successTitle` | editable | Mensaje de confirmación de pago |
| `payment.successBody` | editable | Mensaje de confirmación de pago |
| `payment.pendingTitle` | editable | Mensaje de pago en confirmación |
| `payment.pendingBody` | editable | Mensaje de pago en confirmación (sin datos técnicos) |
| `payment.processing` | codigo | Texto de estado de carga |
| `payment.confirming` | codigo | Texto de estado de carga |
| `payment.walletLabel` | codigo | Etiqueta de control/accesibilidad |
| `payment.cardLabel` | codigo | Etiqueta de control/accesibilidad |
| `payment.errorGateway` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.errorDeclined` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.errorCancelled` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.errorUnavailable` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.errorGeneric` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.nothingDue` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.linkLoading` | codigo | Texto de estado de carga |
| `payment.linkMissing` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.linkGone` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.linkError` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `payment.threeDsReturn` | codigo | Texto de estado de carga |
| `myBooking.title` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `myBooking.lead` | editable | Descripción de la página Mi reserva |
| `myBooking.reference` | codigo | Etiqueta de botón/campo de interfaz |
| `myBooking.sendLink` | codigo | Etiqueta de botón/campo de interfaz |
| `myBooking.sent` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `myBooking.denied` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `myBooking.loadError` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `myBooking.loading` | codigo | Texto de estado de carga |
| `myBooking.meeting` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `myBooking.paid` | codigo | Etiqueta de botón/campo de interfaz |
| `myBooking.pending` | codigo | Etiqueta de botón/campo de interfaz |
| `myBooking.pay` | codigo | Etiqueta de botón/campo de interfaz |
| `myBooking.cancellation` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `myBooking.waivers` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `myBooking.documents` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `myBooking.status.PENDING_PAYMENT` | codigo | Valor de enumeración del API (estado/formato) |
| `myBooking.status.CONFIRMED` | codigo | Valor de enumeración del API (estado/formato) |
| `myBooking.status.COMPLETED` | codigo | Valor de enumeración del API (estado/formato) |
| `myBooking.status.CANCELLED` | codigo | Valor de enumeración del API (estado/formato) |
| `myBooking.status.NO_SHOW` | codigo | Valor de enumeración del API (estado/formato) |
| `myBooking.waiver.PENDING` | codigo | Valor de enumeración del API (estado/formato) |
| `myBooking.waiver.SIGNED` | codigo | Valor de enumeración del API (estado/formato) |
| `myBooking.format.SHARED` | codigo | Valor de enumeración del API (estado/formato) |
| `myBooking.format.PRIVATE` | codigo | Valor de enumeración del API (estado/formato) |
| `myBooking.passengers` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `myBooking.signWaiver` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.title` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.lead` | editable | Texto introductorio del Libro de Reclamaciones, redacción legal |
| `complaints.kind` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.reclamo` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.reclamoHelp` | codigo | Definición legal obligatoria (INDECOPI); ante la duda, código |
| `complaints.queja` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.quejaHelp` | codigo | Definición legal obligatoria (INDECOPI); ante la duda, código |
| `complaints.consumer` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.name` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.minor` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.good` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.service` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.product` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.bookingRef` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.amount` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.amountError` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `complaints.description` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.claim` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.detail` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.request` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `complaints.legalNote` | editable | Nota legal en prosa: la revisa un abogado, no un desarrollador |
| `complaints.submit` | codigo | Etiqueta de botón/campo de interfaz |
| `complaints.sending` | codigo | Texto de estado de carga |
| `complaints.doneTitle` | editable | Mensaje de confirmación del reclamo |
| `complaints.doneNumber` | codigo | Fragmento de frase con datos del reclamo |
| `complaints.doneDue` | codigo | Fragmento de frase con datos del reclamo |
| `complaints.doneCopy` | codigo | Fragmento de frase con datos del reclamo |
| `complaints.errorInvalid` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `complaints.errorUnavailable` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `complaints.errorGeneric` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `waiver.title` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `waiver.loading` | codigo | Texto de estado de carga |
| `waiver.missing` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `waiver.loadError` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `waiver.passenger` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `waiver.minAge` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `waiver.minHeight` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `waiver.version` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `waiver.thanks` | editable | Mensaje de confirmación de la firma |
| `waiver.alreadySigned` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `waiver.noText` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `waiver.minor` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `waiver.minorHint` | codigo | Ayuda de formulario ligada a la validación |
| `waiver.signerName` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `waiver.emergencyName` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `waiver.emergencyPhone` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `waiver.medical` | codigo | Etiqueta de campo, encabezado de formulario o dato del flujo |
| `waiver.accept` | codigo | Casilla de aceptación legal, versionada con la renuncia |
| `waiver.sign` | codigo | Etiqueta de botón/campo de interfaz |
| `waiver.errorSigned` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
| `waiver.errorGeneric` | codigo | Mensaje de error o estado técnico ligado al comportamiento del API |
