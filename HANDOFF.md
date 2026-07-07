# HANDOFF — Servian Contracting CRM

> Documento de traspaso para una nueva sesión de Claude Code.
> Última actualización: 2026-07-07. Léelo entero antes de tocar nada.
> Objetivo: que una sesión nueva continúe SIN leer el historial completo.

---

## 1. Objetivo del proyecto

CRM + herramienta de gestión comercial para **Servian Contracting LLC** (construcción /
reformas / mantenimiento en Dubái, UAE). Empresa pequeña (4 comerciales + 2 managers).
Doble objetivo:
1. **Negocio:** gestionar leads → clientes → proyectos → cotizaciones → obra → **pagos/facturas**,
   con seguimiento comercial y agenda de follow-ups. Captación hoy boca a boca (funciona bien);
   RRSS/Instagram en el futuro.
2. **Aprendizaje:** el usuario (**Eduardo**, no programador) aprende Claude Code construyendo esto.
   **Explica el "qué" y el "por qué" en lenguaje sencillo**, propón ideas (rol "director creativo"),
   no des por hecho conocimientos técnicos. **El usuario habla español → responde en español.**

Reglas de interacción: confirma el enfoque antes de construir algo grande; al cerrar cada bloque
**despliega**, da el **SQL** si hace falta y di **"qué probar"**; no rompas producción.

---

## 2. Dónde está todo

- **Proyecto local:** `/Users/edua.benito/servian-crm`
- **Repo GitHub (privado):** `github.com/edualbenito-design/servian-crm` (rama `main`, identidad git ya configurada)
- **Web en producción:** `https://servian-crm.vercel.app` (Vercel, auto-deploy desde `main`, ~2 min)
- **DB / Auth / Storage:** Supabase (proyecto ref `leyrgzcdpfygfywjgpfv`)
- **Credenciales locales:** `/Users/edua.benito/servian-crm/.env.local` (gitignored, `.env*`). Variables:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
  - `RESEND_API_KEY`, `RESEND_FROM`, `CRON_SECRET` (para el email 9am; ver §11)
- **Roadmap vivo:** `ROADMAP.md`. **Migraciones SQL:** carpeta `sql/`.

⚠️ **Las variables del email deben añadirse también en Vercel** (Production) para que el cron funcione
en producción — el `.env.local` NO se despliega. Pendiente de que el usuario las meta en Vercel.

---

## 3. Stack técnico (versiones reales)

- **Next.js 16.2.9** (App Router, **Turbopack**), **React 19.2.4**, **TypeScript 5**
- **Tailwind CSS v4** (¡ojo sintaxis, ver §7!)
- **Supabase**: Postgres + Auth (email/password) + Storage · `@supabase/ssr ^0.12`, `@supabase/supabase-js ^2.110`
- **@hello-pangea/dnd ^18** (drag & drop del pipeline Kanban)
- **resend ^6.17** (emails) + **Vercel Cron** (`vercel.json`) para el briefing diario
- Hosting **Vercel**, código en **GitHub**

---

## 4. Arquitectura y flujo de datos

- **Server Components** hacen fetch vía `lib/db.ts` (`getClients`, `getClient`, `getQuote`,
  `getDocuments`). Usan `serverClient()` (lib/supabase/server.ts) con la **SECRET key**
  (service_role, salta RLS).
- **Escrituras:** Server Actions en `app/actions.ts`. Toda escritura revalida rutas afectadas.
- **Auth / rol:** `lib/auth.ts` → `getCurrentProfile()`. Lee sesión con el cliente SSR (cookies,
  publishable key) y el perfil (rol + nombre) de la tabla `profiles` con la service key. Si no
  existe perfil, lo crea (rol 'sales') en el primer login.
- **Protección de rutas:** `proxy.ts` (NO middleware — Next 16 lo renombró). Redirige a `/login`
  sin sesión y de `/login` a `/` con sesión.
- **RLS DESHABILITADA en todas las tablas.** La seguridad se aplica en el **servidor**: cada
  lectura/escritura pasa por `getCurrentProfile` y filtra por rol. Managers ven todo; comerciales
  (sales) solo ven clientes donde `assigned_to == profile.full_name`.
  ⚠️ Para que un comercial vea sus clientes, su `profiles.full_name` debe coincidir EXACTAMENTE
  con el `assigned_to` de esos clientes.
- **Permisos de escritura** (helpers en `app/actions.ts`): `assertCanAccessClient(clientId)` deja
  pasar a managers y al comercial dueño; acciones sensibles (borrar, aprobar, subir docs de
  empresa) exigen `profile.isManager`.
- **Email 9am:** ruta `app/api/cron/daily-followups/route.ts` (protegida por `CRON_SECRET`,
  header `Authorization: Bearer` o `?key=`). Vercel Cron la llama a las **05:00 UTC = 9:00 Dubái**
  (`vercel.json`). `lib/email.ts` resuelve name→email (join profiles+auth), agrupa follow-ups
  vencidos/hoy por comercial y manda a cada uno su lista con Resend.

---

## 5. Estructura de carpetas (lo importante)

```
lib/
  data.ts        Tipos + constantes (SALESPEOPLE, CAPTURERS, PIPELINE_STAGES, PAYMENT_METHODS,
                 PAYMENT_MILESTONES) + helpers (followUpState, quoteTotals, paymentSummary).
                 FUENTE DE VERDAD de los tipos (Client, Project, Quote, Payment…).
  db.ts          Lecturas + mapeos DB→tipos. Filtra archivados (deleted_at) de listas y proyectos.
                 attachProjectFiles + attachPayments cargan datos anidados con signed URLs / pagos.
  auth.ts        getCurrentProfile() → { id, email, name, role, isManager }
  analytics.ts   KPIs/funnel del dashboard de managers
  team.ts        Helpers de la pestaña Team
  collections.ts Cobros: resumen, tramos de antigüedad (ageing) y pendiente por comercial (helpers puros)
  company.ts     Datos de empresa + banco + `trn` (vacío, pendiente Sergio) para PDF/factura
  email.ts       Resend: recipientsByName(), dueFollowUps(), sendFollowUpEmail() + plantilla HTML
  supabase/      server.ts (service key) · ssr.ts (cookies/sesión) · browser.ts (login cliente)
proxy.ts         Protección de rutas (Next 16 "proxy")
vercel.json      Cron: /api/cron/daily-followups a las "0 5 * * *" (9am Dubái)
app/
  layout.tsx     Cabecera (logo→/home, NavLinks, ThemeToggle, user chip, sign out) + footer + tema anti-flash
  globals.css    Tailwind v4 + variables de tema + @custom-variant dark
  page.tsx       Lista de clientes ("/") → ClientsTable
  ClientsTable.tsx   Tabla (desktop) + tarjetas (móvil), buscador, filtros, WhatsApp directo, aviso borrado
  NewClientModal.tsx Botón + modal "New Client" (acepta presetAssignedTo)
  actions.ts     TODAS las Server Actions (clientes, proyectos, quotes, pagos/facturas, borrado, files, docs)
  login/         page.tsx + actions.ts (signIn/signOut)
  home/          Landing al pinchar el logo (stats + tarjetas de secciones)
  dashboard/     Managers: analytics global. Sales: <SalesDashboard/> personal
  pipeline/      page.tsx + KanbanBoard.tsx (8 etapas, drag&drop)
  calendar/      page.tsx + CalendarView.tsx (mes de follow-ups; clic en un lead → su ficha)
  collections/   page.tsx (Cobros: dinero pendiente en quotes aceptadas; managers todo, sales lo suyo)
  team/          Lista comerciales + [slug]/ (ficha por comercial)
  documents/     Managers: subir/descargar docs de empresa (Storage)
  clients/[id]/  page.tsx + ClientDetail.tsx (ficha; incluye ProjectCard, DeletionZone,
                 QuotesSection, PaymentsPanel, FilesSection, historial, contacto rápido)
  quotes/[id]/   page.tsx + QuotePrint.tsx (documento imprimible; ?doc=invoice = TAX INVOICE)
  api/cron/daily-followups/route.ts   Endpoint del briefing 9am (Resend)
  components/    NavLinks.tsx (Dashboard/Clients/Pipeline/Calendar + Team/Docs), ThemeToggle.tsx, Logo.tsx
public/          logo.png, logo-dark.png (el PDF usa /logo.png)
sql/             Migraciones (una por feature; ejecutar en Supabase → SQL Editor)
```

---

## 6. Modelo de datos (Supabase — RLS deshabilitada en todas)

- **clients**: id, name, phone, email, location, property_type (villa/apartment/office/other),
  renovation_type (texto), lead_source (referral/instagram/other), assigned_to, captured_by,
  captured_at, next_follow_up, notes, created_at, **deleted_at/deleted_by** (archivado),
  **deletion_requested_by/at/reason** (solicitud de borrado)
- **projects**: id, client_id, name, description, budget, status (active/completed/on-hold),
  pipeline_stage (1..8), start_date, end_date, contractor, team_members (jsonb string[]),
  suppliers (jsonb {name,material}[]), approved/approved_by/approved_at, created_at,
  **deleted_at/deleted_by** + **deletion_requested_by/at/reason**
- **activities**: id, client_id, project_id (null = historial de cliente; con valor = de proyecto),
  type (note/client_updated/project_created/project_updated/stage_changed), description, created_at
- **follow_ups**: id, client_id, project_id (null = general/lead), due_date, note, status
  (pending/done), done_note/done_at/done_by, created_by, created_at. **Fuente de verdad de los
  follow-ups** (tareas con ciclo de vida). `clients.next_follow_up`/`follow_up_note` quedan como
  LEGACY: `getClients` deriva `nextFollowUp`/`followUpNote` = follow-up pendiente más próximo (para
  lista/dashboard/email); si la tabla no existe aún, cae a la columna legacy.
- **quotes**: id, project_id, client_id, number (Q-YYYY-NNNN), status (draft/sent/accepted/rejected),
  issue_date, valid_until, vat_rate (def 5), notes, items (jsonb {description,qty,unitPrice}[]),
  sent_at, created_at, **invoice_number/invoiced_at** (factura emitida)
- **payments**: id, quote_id, project_id, client_id, amount, method (cash/bank/cheque/card/other),
  paid_on, **milestone** (First/Second/Final payment…), note, created_by, created_at
- **project_files**: id, project_id, client_id, name, path, mime, size, category
  (render/receipt/document/other), uploaded_by, created_at
- **documents** (empresa): id, name, path, mime, size, uploaded_by, created_at
- **profiles**: id (=auth.users.id), full_name, role (manager/sales), created_at

Storage buckets privados: **company-docs**, **project-files** (descargas por signed URLs 3600s).

**Personas:**
- **Managers** (ven todo, Dashboard analítico + Team + Docs): **Eduardo** (edu.albenito@gmail.com),
  **Sergio** (studio@serviancontracting.com).
- **Comerciales** (SALESPEOPLE, ven solo lo suyo): **Alfie** (alfie.infante101786@gmail.com),
  **Joana** (joanamarieconceja@gmail.com) → cuentas creadas, full_name = "Alfie"/"Joana".
  **Elsayed**, **Faizan** → SIN cuenta aún (faltan sus emails).
- **CAPTURERS** = los 4 comerciales + Eduardo + Sergio.

**Migraciones aplicadas** (todas corridas en Supabase salvo aviso): base + aprobación de proyectos
+ trigger de perfiles + `deletion-archive` + `payments-invoices`. **Pendientes de correr por el
usuario:**
- `sql/2026-07-07-payment-milestone.sql` (opcional; columna `payments.milestone`, escritura resiliente).
- `sql/2026-07-07-follow-up-note.sql` (columna `clients.follow_up_note`; ahora legacy pero el backfill
  de follow-ups la lee — correr ANTES del siguiente).
- `sql/2026-07-07-follow-ups-table.sql` (**crea la tabla `follow_ups` + backfill**; necesaria para que
  los follow-ups como tareas persistan. Sin ella, la UI de follow-ups no guarda nada).

---

## 7. Convenciones y decisiones técnicas CLAVE (no las rompas)

1. **Tailwind v4 — variables con PARÉNTESIS:** `bg-(--accent)`, nunca `bg-[--accent]` (roto en v4).
   Usa las variables de tema existentes (`--background/--surface/--card/--border/--accent/--text-*`).
2. **Modo claro/oscuro por CLASE:** `@custom-variant dark` en globals.css; clase `.dark` en `<html>`
   (ThemeToggle + script anti-flash, default dark). Colores duales `bg-white dark:bg-zinc-900`.
3. **`proxy.ts`, no `middleware.ts`** (Next 16). Exporta `export async function proxy(request)`.
4. **Botones de acento:** `bg-(--accent) text-white dark:text-black`.
5. **Lecturas/escrituras RESILIENTES ante columnas que puedan faltar** (permite desplegar ANTES de
   correr el SQL sin romper producción). Patrón: (a) reintentar sin la columna nueva
   (`updateClient`, `addPayment` con milestone); (b) filtrar en JS en vez de en la query
   (archivados en `getClients`). Mantén este patrón al añadir columnas.
6. **Money en móvil:** NO metas `AED 1,234,567` como valor grande (se sale); unidad en la etiqueta.
7. **Optimistic UI:** ClientDetail y sus secciones mantienen estado local y actualizan al instante;
   las Server Actions persisten + revalidatePath. Al crear objetos optimistas de Project/Quote hay
   que incluir TODOS los campos nuevos (payments, deletion*, etc.) o TypeScript falla.
8. **Borrado = ARCHIVADO recuperable** (soft delete `deleted_at`), nunca hard delete desde la UI.
   Comercial **solicita** (deletion_requested_*), manager **confirma** (archiva) o rechaza; manager
   archiva directo con confirmación. `getClients`/`getClient`/`toClient` ocultan archivados.
9. **Estilo:** componentes funcionales, comentarios escuetos en inglés, mismo patrón que el código
   existente (mira ClientsTable/ClientDetail/QuotesSection antes de crear UI nueva).

---

## 8. Cómo trabajar (flujo operativo)

- **Comprobar tipos** (no hay test runner): `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
  (con ruta relativa desde el proyecto; el cwd del shell puede resetearse, usa `cd` explícito).
- **Desplegar:** `git add -A && git commit && git push origin main` → Vercel despliega solo.
  Termina los mensajes de commit con `Co-Authored-By: Claude ...`.
- **DDL (CREATE/ALTER/DROP TABLE):** NO se puede desde el agente (sin password de la DB). Entrega
  el SQL al usuario para Supabase → SQL Editor y guárdalo en `sql/`. Si es columna en tablas
  existentes, hazlo resiliente (§7.5) para desplegar antes.
- **SÍ se puede** con la service key vía API REST/Storage/Auth-admin: insert/update/delete de datos,
  crear buckets, crear/borrar usuarios de Auth, signed URLs. (Script node con `fetch` + `.env.local`.)
- **Verificación en navegador:** ⚠️ el login del PREVIEW (Claude Preview) NO persiste sesión — no
  verifiques ahí pantallas autenticadas (se queda en /login). Verifica lo autenticado en **Vercel**
  (lo prueba el usuario en su móvil/PC). Confía en `tsc` + revisión de código para lo autenticado.

---

## 9. Estado actual — FUNCIONALIDADES TERMINADAS (todo en producción)

- **CRM:** lista de clientes (tabla desktop / tarjetas móvil), **buscador**, filtros (mes /
  comercial / "Due"), stats, **WhatsApp directo desde la lista**.
- **Crear cliente manual** (New Client) con captado por / gestionado por / renovación / fechas.
- **Ficha de cliente:** editar todo, **contacto rápido WhatsApp/Llamar/Email**, panel de detalles.
- **Proyectos** (acordeón): equipo, contractor, proveedores; historial por proyecto y cliente;
  **visto bueno de manager** (aprobar/revocar).
- **Borrar/archivar cliente y proyecto con visto bueno del manager** (recuperable): comercial
  solicita con motivo → manager aprueba (archiva) o rechaza; manager archiva directo con
  confirmación. Aviso ámbar en lista y ficha. En proyecto: botón papelera en la cabecera + zona
  de borrado arriba del detalle.
- **Cotizaciones** por proyecto: líneas + 5% VAT, Q-AÑO-NNNN, estados, **PDF imprimible** con
  formato de factura (logo, empresa, banco WIO).
- **Pagos y facturas:** en cada cotización **aceptada**, panel Payments con **Debido/Pagado/Saldo**,
  **% pagado/pendiente** con barra, estado (Unpaid/Partial/Paid), registro de pagos
  (importe/método/fecha/**hito**/nota) y **TAX INVOICE imprimible** (INV-AÑO-NNNN, ?doc=invoice).
- **Archivos por proyecto** (renders/comprobantes/docs) → Supabase Storage.
- **Follow-ups como TAREAS** (tabla `follow_ups`): sobre el proyecto (o generales a nivel cliente
  para leads). Ciclo de vida: crear (fecha+nota) → pendiente/atrasado (sigue avisando) → **aplazar**
  (nueva fecha + porqué) o **marcar hecho** (con nota de resultado, guarda quién/cuándo). Lista de
  pendientes + **historial** de hechos por proyecto/cliente. En `/calendar`: cada tarea su día, con
  botones **Done** y **Move** inline (con nota). Nota pendiente: **adjuntar captura** (Mejora 2).
- **Adjuntos opcionales:** un archivo por **pago** (justificante/captura de la transferencia) y por
  **follow-up** (captura de la conversación). Botón "Attach" compacto (componente `AttachmentControl`);
  se guardan en el bucket privado `project-files` (columnas `receipt_path/name` en payments y
  `attachment_path/name` en follow_ups). Lecturas resilientes; requiere `sql/2026-07-07-attachments.sql`.
- **Cobros** (`/collections`): dinero pendiente en cotizaciones **aceptadas** (balance > 0). KPIs
  (pendiente total, vencido >30d, cobrado este mes), tramos por antigüedad (ageing), pendiente por
  comercial (managers) y lista de deudas (mayor/más antigua primero) con WhatsApp + enlaces a ficha
  y factura. Managers ven todo; comerciales solo lo suyo. Sin SQL nuevo (usa quotes+payments).
- **Pipeline Kanban** 8 etapas con drag & drop.
- **Login con roles**, protección de rutas.
- **Dashboard:** managers = analítica global; comerciales = dashboard personal (SalesDashboard).
- **Calendario de follow-ups** (`/calendar`): cada lead en el día que toca seguirlo; clic → su ficha.
- **Email briefing 9am** (Resend + Vercel Cron): a cada comercial su lista de seguimientos del día
  con enlaces. **Código listo y desplegado; falta activarlo en producción (ver §10/§11).**
- **Team** (managers), **Documentos de empresa** (managers), **Home**, tema claro/oscuro, logo SVG,
  responsive móvil (el usuario confirma que se ve bien).

---

## 10. Tareas pendientes (priorizadas)

0. **Bloque "obra + pagos" en curso** (pedido por Eduardo, 4 mejoras, se construyen una a una):
   1. ✅ Follow-up con nota (hecho, luego evolucionado a tareas).
   2a. ✅ **Follow-ups como tareas** por proyecto (hecho). SQL `follow-ups-table.sql` + `follow-up-note.sql`.
   2b. ⏳ **Adjuntos opcionales** (sistema único reutilizable): captura de conversación en follow-ups
       (crear/aplazar/completar, opcional) + **justificante en cada pago**. Reutilizar `project-files`
       o columna en la fila. Notas ya van en cada paso del follow-up.
   3. ⏳ **Aviso de anticipo (50%) antes del inicio de obra**: si `project.start_date` se acerca y no se
      ha recibido el 50% de la(s) quote(s) aceptada(s), banner en ficha/proyecto + aviso en calendario.
      Se calcula solo (sin SQL). Anticipo por defecto 50% (confirmar si configurable).
   4. ⏳ **Hitos de obra con % de avance** (editable por proyecto + plantilla por defecto, ej. cocina:
      Desmantelar 20 → Alicatado+electricidad 60 → Muebles 70 → Electrodomésticos 90 → Limpieza 100).
      Guardar en jsonb en `projects` (resiliente). Objetivo: que cualquiera entienda el estado de la obra.
1. **Activar el email 9am en producción** (código ya hecho): el usuario debe **añadir en Vercel**
   (Production) `RESEND_API_KEY`, `RESEND_FROM`, `CRON_SECRET` y redeploy. Probar con
   `/api/cron/daily-followups?key=<CRON_SECRET>`. ⚠️ Sin dominio verificado, Resend en modo prueba
   solo entrega al correo de la cuenta Resend del usuario.
2. **Verificar dominio en Resend** para enviar desde `crm@serviancontracting.com` a todo el equipo
   → **depende de que Sergio dé el dominio y acceso DNS** (ver §12). Al verificar, cambiar
   `RESEND_FROM` al correo del dominio.
3. **Crear cuentas de Elsayed y Faizan** cuando lleguen sus emails (Auth → Add user, luego
   `UPDATE profiles SET full_name='<nombre exacto>'`, igual que Alfie/Joana).
4. **TRN en las facturas:** cuando Sergio lo envíe, ponerlo en `lib/company.ts` (`trn`) y sale solo.
5. **Correr SQL opcional** `sql/2026-07-07-payment-milestone.sql` (etiqueta de hito en pagos).
6. **Captación RRSS/Instagram — ON HOLD** (el usuario debe hablar con su agencia para saber cómo
   integrarlo con los sistemas de ellos). Plan acordado (3 fases):
   - **Fase 1 (interna):** campo "Campaña" en el lead + vista/filtro "Unassigned" + botón "Asignar a
     [comercial]" + (opc.) stat de leads sin asignar / por campaña.
   - **Fase 2 (entrada automática):** página **pública** (link en bio IG / anuncios) que crea el lead
     en el pool "Unassigned" ya etiquetado con la campaña del enlace.
   - **Fase 3 (futuro):** reparto round-robin automático entre comerciales.
   Ya existe base: `lead_source` (incluye instagram) y "Unassigned" como assigned_to.
7. (Opcional/futuro) Estados de obra, más analítica, etc.

---

## 11. Variables de entorno y despliegue del email

`.env.local` (local, gitignored) ya tiene los valores. **Para producción, añadir en Vercel →
Settings → Environment Variables (Production) y redeploy:**
- `RESEND_API_KEY` — la key de Resend del usuario (empieza por `re_`).
- `RESEND_FROM` — hoy `Servian CRM <onboarding@resend.dev>` (modo prueba). Cambiar al dominio real
  cuando esté verificado.
- `CRON_SECRET` — secreto que protege el endpoint del cron (lo genera Claude; ya está en `.env.local`).
- (Opcional) `NEXT_PUBLIC_APP_URL` — por defecto `https://servian-crm.vercel.app` (para los enlaces
  del email); solo cambiar si cambia el dominio.

Cron: `vercel.json` → `/api/cron/daily-followups` a `0 5 * * *` (UTC) = **9:00 Dubái**. Vercel manda
`Authorization: Bearer ${CRON_SECRET}`. En plan Hobby los crons son diarios y corren dentro de la hora.

**Nota de seguridad:** la `RESEND_API_KEY` se compartió por chat; conviene regenerarla en Resend tras
configurarla en Vercel.

---

## 12. Qué necesitamos de Sergio (bloquea features de arriba)

1. **Dominio de email** (p.ej. `serviancontracting.com` o subdominio) + **acceso al DNS** para
   verificarlo en Resend → habilita enviar desde `crm@serviancontracting.com` a todo el equipo
   (sin esto, el email 9am solo llega al correo del usuario en modo prueba). [Bloquea §10.2]
2. **TRN** (Tax Registration Number) de Servian → para que las facturas sean fiscalmente válidas en
   UAE; se pone en `lib/company.ts`. [Bloquea §10.4]
3. **Emails de los comerciales que faltan**: **Elsayed** y **Faizan** → para crearles cuenta. [§10.3]
4. Confirmar el **correo "from"** deseado (p.ej. `crm@` vs `no-reply@serviancontracting.com`).
5. (Para RRSS, más adelante) Con la **agencia**: cómo integran captación online y si usan alguna
   herramienta (Meta Lead Ads, Zapier/Make…) para conectar con el CRM.

---

## 13. Problemas conocidos y cómo se resolvieron

- **Tailwind v4 corchetes** `bg-[--x]` no funcionan → todo a `bg-(--x)`.
- **middleware deprecado en Next 16** → `proxy.ts` / función `proxy`.
- **Trigger `handle_new_user`** rompía alta de usuarios → reescrito blindado (SET search_path +
  EXCEPTION) + red de seguridad: el perfil también se crea en `getCurrentProfile` al primer login.
- **Alfie/Joana veían su correo en vez del nombre** → tenían `profiles.full_name` vacío; se rellenó
  ("Alfie"/"Joana"). El código usa `full_name || email`.
- **Borrado de proyecto no se veía** → estaba al fondo del acordeón; se subió arriba + botón papelera
  en la cabecera.
- **Preview no persiste sesión** → verificar en Vercel.

---

## 14. Contexto extra para continuar sin el historial

- El proyecto avanza **feature por feature**: confirmar enfoque (con preguntas si hay decisiones del
  usuario), construir, `tsc`, commit+push, dar SQL si aplica, decir "qué probar". Actualizar
  `ROADMAP.md` y este HANDOFF al cerrar bloques grandes.
- El usuario decide prioridades; ahora mismo lo único que "falta de verdad" es **activar el email**
  (depende de Sergio) y **RRSS** (on hold por la agencia). El resto está funcional para el día a día.
- No hay password de la DB en el agente: **DDL siempre se entrega como SQL** al usuario.
- Repaso rápido de archivos que tocarás casi siempre: `lib/data.ts` (tipos), `lib/db.ts` (lecturas),
  `app/actions.ts` (escrituras), `app/clients/[id]/ClientDetail.tsx` (ficha, la UI más grande).
