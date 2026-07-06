# Servian CRM — Estado del proyecto

Última actualización: 2026-07-05

## ✅ Hecho
- CRM: lista de clientes con stats, ficha de cliente, edición
- Pipeline Kanban de 8 etapas con drag & drop y navegación al cliente
- Tema claro/oscuro (Tailwind v4)
- Base de datos real (Supabase) — los datos se guardan
- Pestaña **Team**: stats por comercial + filtros + detalle por persona
- Historial de actividad a **nivel proyecto** y a **nivel cliente**
- Equipos, empresa externa (contractor) y proveedores por proyecto
- **Login con roles**: managers (Eduardo, Sergio) ven todo; comerciales solo lo suyo
- Captación: "captado por" + "gestionado por" + fecha de captación
- Crear cliente manual (botón New Client)
- Filtro por mes en la lista de clientes
- Proyecto en modo **acordeón** (clic para ver todo; Edit solo para cambiar)
- **Visto bueno de manager por proyecto** (aprobar/revocar, con quién y cuándo)
- **Dashboard de inteligencia** (KPIs, leads por mes, funnel de pipeline, fuente de leads, rendimiento por comercial, duración media por tamaño) — solo managers

## 🎯 En curso
- [x] **Cotizaciones**: crear por proyecto, líneas + 5% VAT, PDF imprimible, seguimiento de estado
- [x] **Tipo de renovación** (campo texto libre en cliente)
- [x] **Documentos de empresa** (managers): subir/descargar/borrar (Supabase Storage, bucket company-docs privado)
- [x] **Archivos por proyecto**: renders, comprobantes de pago, docs por proyecto (Supabase Storage, bucket project-files)
- [x] **Contacto rápido**: botones WhatsApp / Llamar / Email en la ficha del cliente
- [x] **Buscador de clientes** en la lista
- [x] **Agenda de seguimientos**: campo "próximo seguimiento", avisos vencido/hoy, filtro "Due" en lista, KPI en dashboard
- [ ] Automatizar aviso diario 9am de seguimientos (necesita cron + email/Resend) — pendiente
- [ ] Integrar logo + formato fijo en el PDF de cotización (pendiente de recibir el logo)
- Nota: pulido de móvil PAUSADO a propósito hasta rematar funcionalidad del CRM (versión móvil actual ya usable)

## ✅ Hecho (despliegue)
- [x] **Desplegado en Vercel**: servian-crm.vercel.app (público, protegido por login)
- [x] Cuentas manager: Eduardo + Sergio

## ⏳ Pendiente / siguientes pasos
- [x] **Borrar cliente/proyecto con visto bueno del manager** (archivado recuperable):
  el comercial solicita el borrado (con motivo), el manager confirma (archiva) o rechaza;
  los managers archivan directo con confirmación. Soft delete (deleted_at) → desaparece
  de listas/pipeline/analytics pero sigue en la DB. Aviso visible en lista de clientes y ficha.
- [x] Cuentas reales de **Alfie** (alfie.infante101786@gmail.com) y **Joana**
  (joanamarieconceja@gmail.com) — rol sales, full_name = "Alfie"/"Joana" (ven su nombre, no el correo)
- [ ] ⏸️ (BLOQUEADO: faltan sus emails) Crear cuentas de Elsayed y Faizan (rol sales, full_name exacto)
- [ ] 🔽 (ADICIONAL, no prioritario — boca a boca funciona bien) Estructura para leads de RRSS
  (campos de campaña/UTM) + pool genérico "Unassigned" → asignación (manual ahora, round-robin futuro)
- [x] Adjuntar archivos/fotos por proyecto (renders/comprobantes/docs por proyecto, Supabase Storage)
- [x] **Estados de pago / facturas**: en cada cotización aceptada se registran pagos
  (importe/método/fecha/nota) con resumen Debido/Pagado/Saldo y estado
  (Sin pagar/Parcial/Pagado). Botón para emitir **TAX INVOICE** imprimible
  (INV-AÑO-NNNN, reutiliza el diseño del PDF, muestra pagado y saldo). TRN opcional
  en `lib/company.ts` (pendiente de que Sergio lo envíe). % pagado/pendiente con barra
  de progreso + etiqueta de hito por pago (Primer/Segundo/Último pago).
  SQL: `sql/2026-07-07-payments-invoices.sql` + `sql/2026-07-07-payment-milestone.sql`
- [x] Contacto directo WhatsApp/Llamar/Email en la ficha del cliente (opcional futuro: también desde la lista)
- [ ] ⏸️ (EN PAUSA: espera dominio de Sergio + cuenta Resend) Recordatorios / briefing diario 9am por email
- [x] Desplegado en Vercel (servian-crm.vercel.app), multi-dispositivo

## 🗄️ Migraciones SQL en Supabase
- [x] Borrado/archivado (clients y projects): `sql/2026-07-07-deletion-archive.sql` — corrido.
- [x] Pagos y facturas (tabla payments + invoice_number/invoiced_at en quotes):
  `sql/2026-07-07-payments-invoices.sql` — corrido.
- [ ] Etiqueta de hito en pagos: `sql/2026-07-07-payment-milestone.sql` — pequeño y opcional
  (los pagos se guardan sin él; solo activa que se guarde la etiqueta Primer/Segundo/Último pago).
- [x] Columnas de aprobación en projects y trigger de perfiles — ya aplicadas anteriormente.
