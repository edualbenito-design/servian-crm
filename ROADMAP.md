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
- [ ] Crear cuentas de los otros comerciales cuando haya emails: Elsayed, Faizan (rol sales, full_name exacto)
- [ ] Estructura para leads de RRSS (campos de campaña/UTM) + pool genérico → asignación (manual ahora, round-robin igualitario futuro)
- [ ] Adjuntar archivos/fotos por proyecto (presupuestos, planos, fotos del sitio)
- [x] **Estados de pago / facturas**: en cada cotización aceptada se registran pagos
  (importe/método/fecha/nota) con resumen Debido/Pagado/Saldo y estado
  (Sin pagar/Parcial/Pagado). Botón para emitir **TAX INVOICE** imprimible
  (INV-AÑO-NNNN, reutiliza el diseño del PDF, muestra pagado y saldo). TRN opcional
  en `lib/company.ts`. SQL: `sql/2026-07-07-payments-invoices.sql`
- [ ] Botón de WhatsApp directo por cliente
- [ ] Recordatorios / próxima acción + briefing diario 9am
- [ ] Desplegar a una URL pública (Vercel) para uso multi-dispositivo

## 🗄️ Migraciones SQL pendientes de ejecutar en Supabase
- [x] **Borrado/archivado** (columnas en clients y projects): `sql/2026-07-07-deletion-archive.sql` — corrido.
- [ ] **Pagos y facturas** (tabla payments + invoice_number/invoiced_at en quotes):
  `sql/2026-07-07-payments-invoices.sql` — necesario para registrar pagos y emitir facturas.
- [ ] Columnas de aprobación en projects (ver mensaje del chat):
  ```sql
  ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS approved_by text,
    ADD COLUMN IF NOT EXISTS approved_at timestamptz;
  ```
- [ ] Trigger blindado de creación de perfiles (ver mensaje del chat)
