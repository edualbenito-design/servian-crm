# Servian CRM — Estado del proyecto

Última actualización: 2026-07-07

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
- [ ] ⏸️ ON HOLD (el usuario debe hablar con su agencia para integrar con sus sistemas) — Captación RRSS:
  Fase 1 campo "Campaña" + vista/filtro "Unassigned" + botón "Asignar a [comercial]" · Fase 2 página
  pública de intake (link IG) → pool "Unassigned" · Fase 3 reparto round-robin. Ver HANDOFF §10.6.
- [x] Adjuntar archivos/fotos por proyecto (renders/comprobantes/docs por proyecto, Supabase Storage)
- [x] **Estados de pago / facturas**: en cada cotización aceptada se registran pagos
  (importe/método/fecha/nota) con resumen Debido/Pagado/Saldo y estado
  (Sin pagar/Parcial/Pagado). Botón para emitir **TAX INVOICE** imprimible
  (INV-AÑO-NNNN, reutiliza el diseño del PDF, muestra pagado y saldo). TRN opcional
  en `lib/company.ts` (pendiente de que Sergio lo envíe). % pagado/pendiente con barra
  de progreso + etiqueta de hito por pago (Primer/Segundo/Último pago).
  SQL: `sql/2026-07-07-payments-invoices.sql` + `sql/2026-07-07-payment-milestone.sql`
- [x] Contacto directo WhatsApp/Llamar/Email en la ficha del cliente + **WhatsApp directo desde la lista**
- [x] **Follow-ups como tareas** (tabla `follow_ups`): sobre el proyecto (o generales por cliente),
  con ciclo de vida crear→pendiente/atrasado→aplazar/hecho, nota en cada paso, historial de hechos,
  y acciones Done/Move desde el calendario. SQL: `follow-ups-table.sql` + `follow-up-note.sql`.
- [ ] ⏳ **Adjuntos opcionales** (Mejora 2b): captura en follow-ups + justificante en pagos (1 sistema).
- [ ] ⏳ **Aviso de anticipo 50% antes del inicio de obra** (Mejora 3, sin SQL).
- [ ] ⏳ **Hitos de obra con % de avance** (Mejora 4, jsonb en projects, plantilla editable).
- [x] **Follow-ups como tareas** (sobre el proyecto): crear/completar/aplazar con nota en cada
  paso, historial de hechos, acciones desde el calendario. SQL: `sql/2026-07-07-follow-ups-table.sql`
- [x] **Adjuntos opcionales**: justificante por pago + captura de conversación por follow-up
  (bucket privado project-files). SQL: `sql/2026-07-07-attachments.sql`
- [x] **Hitos de obra (% de avance)**: checklist editable por proyecto, barra de progreso.
  SQL: `sql/2026-07-07-site-progress.sql`
- [x] **Calendario tipo agenda**: día dividido en To-do / Done that day (historial de lo hecho)
- [x] **Aviso de advance payment antes de empezar**: si la obra arranca (≤7 días o ya empezó) y no
  ha entrado el 50%, banner rojo + chip en la ficha del proyecto y aviso arriba del calendario.
  Sin SQL (calculado desde fecha de inicio + pagos).
- [x] **Panel de Cobros** (`/collections`): dinero pendiente en cotizaciones aceptadas
  (pendiente total, vencido >30d, cobrado este mes, tramos por antigüedad, pendiente por comercial,
  lista de deudas mayor/más antigua primero con WhatsApp y enlaces). Sin SQL nuevo. Managers todo,
  comerciales lo suyo.
- [ ] ⏸️ (EN PAUSA: espera dominio de Sergio + cuenta Resend) Recordatorios / briefing diario 9am por email
- [x] Desplegado en Vercel (servian-crm.vercel.app), multi-dispositivo

## 🗄️ Migraciones SQL en Supabase
- [x] Borrado/archivado (clients y projects): `sql/2026-07-07-deletion-archive.sql` — corrido.
- [x] Pagos y facturas (tabla payments + invoice_number/invoiced_at en quotes):
  `sql/2026-07-07-payments-invoices.sql` — corrido.
- [ ] Etiqueta de hito en pagos: `sql/2026-07-07-payment-milestone.sql` — pequeño y opcional
  (los pagos se guardan sin él; solo activa que se guarde la etiqueta Primer/Segundo/Último pago).
- [x] Columnas de aprobación en projects y trigger de perfiles — ya aplicadas anteriormente.
