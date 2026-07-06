# HANDOFF — Servian Contracting CRM

> Documento de traspaso para una nueva sesión de Claude Code.
> Última actualización: 2026-07-06. Léelo entero antes de tocar nada.

---

## 1. Objetivo del proyecto

CRM + herramienta de gestión comercial para **Servian Contracting LLC** (empresa de
construcción / reformas / mantenimiento en Dubái, UAE). Empresa pequeña (4 comerciales
+ 2 managers). Dos objetivos:
1. **Negocio:** gestionar leads → clientes → proyectos → cotizaciones → obra, con
   seguimiento comercial, y captar leads (hoy offline; en el futuro desde RRSS/Instagram).
2. **Aprendizaje:** el usuario (Eduardo, no programador) aprende a usar Claude Code
   construyendo esto. **Explica el "qué" y el "por qué" en lenguaje sencillo**, propón
   ideas proactivamente (rol de "director creativo"), y no des por hecho conocimientos técnicos.

El usuario habla **español**. Responde en español.

---

## 2. Dónde está todo

- **Proyecto local:** `/Users/edua.benito/servian-crm`
- **Repo GitHub (privado):** `github.com/edualbenito-design/servian-crm` (rama `main`)
- **Web en producción:** `https://servian-crm.vercel.app` (Vercel, auto-deploy desde `main`)
- **Base de datos / Auth / Storage:** Supabase (proyecto ref `leyrgzcdpfygfywjgpfv`)
- **Credenciales:** en `/Users/edua.benito/servian-crm/.env.local` (gitignored). Variables:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- **Roadmap vivo:** `ROADMAP.md` (hecho / pendiente). Mantenlo actualizado al cerrar cosas.

---

## 3. Stack técnico

- **Next.js 16.2** (App Router, **Turbopack**), **React 19**, **TypeScript**
- **Tailwind CSS v4** (¡ojo con la sintaxis, ver §7!)
- **Supabase**: Postgres + Auth (email/password) + Storage
- **@supabase/ssr** (sesiones con cookies), **@supabase/supabase-js**
- **@hello-pangea/dnd** (drag & drop del pipeline Kanban)
- Hosting **Vercel**, código en **GitHub**

---

## 4. Arquitectura y flujo de datos

- **Server Components** hacen fetch vía `lib/db.ts` (`getClients`, `getClient`, `getQuote`,
  `getDocuments`). Usan `serverClient()` (lib/supabase/server.ts) con la **SECRET key**
  (service_role, salta RLS).
- **Escrituras**: Server Actions en `app/actions.ts` (`updateClient`, `createClient`,
  `createProject`, `updateProject`, `updatePipelineStage`, `addNote`, `addProjectNote`,
  `setProjectApproval`, quotes CRUD, `uploadProjectFile`, `deleteProjectFile`,
  `uploadDocument`, `deleteDocument`).
- **Auth / rol**: `lib/auth.ts` → `getCurrentProfile()`. Lee la sesión con el cliente SSR
  (cookies, publishable key) y el perfil (rol + nombre) de la tabla `profiles` con la
  service key. Si no existe perfil, lo crea (upsert, rol 'sales') en el primer login.
- **Protección de rutas**: `proxy.ts` (NO middleware — ver §7). Redirige a `/login` sin
  sesión y de `/login` a `/` con sesión.
- **RLS está DESHABILITADA** en todas las tablas. La seguridad se aplica en el **servidor**:
  toda lectura/escritura pasa por getCurrentProfile y filtra por rol. Managers ven todo;
  comerciales (sales) solo ven clientes donde `assigned_to == profile.full_name`.
  ⚠️ Para que un comercial vea sus clientes, su `profiles.full_name` debe coincidir
  EXACTAMENTE con el valor `assigned_to` de esos clientes.

---

## 5. Estructura de carpetas (lo importante)

```
lib/
  data.ts        Tipos + constantes (SALESPEOPLE, CAPTURERS, PIPELINE_STAGES,
                 helpers followUpState/quoteTotals). Fuente de verdad de los tipos.
  db.ts          Lecturas (getClients/getClient/getQuote/getDocuments) + mapeos DB→tipos.
  auth.ts        getCurrentProfile() → { id, email, name, role, isManager }
  analytics.ts   Cálculos del dashboard de managers (KPIs, funnel, por comercial, etc.)
  team.ts        Helpers de la pestaña Team (projectsForSalesperson, statsFor, slug)
  company.ts     Datos de empresa + banco para el PDF de cotización
  supabase/
    server.ts    serverClient() con service key (lecturas/escrituras servidor)
    ssr.ts       ssrClient() con cookies (lee sesión)
    browser.ts   browserClient() (login en cliente)
proxy.ts         Protección de rutas (Next 16 "proxy", antes middleware)
app/
  layout.tsx     Cabecera (logo→/home, NavLinks, ThemeToggle, user chip, sign out) + footer.
                 Logo SVG en components/Logo.tsx. Script anti-flash de tema.
  globals.css    Tailwind v4 + variables de tema (light :root / dark html.dark) + @custom-variant dark
  page.tsx       Lista de clientes ("/") → ClientsTable (client component)
  ClientsTable.tsx   Tabla (desktop) + tarjetas (móvil), buscador, filtros (mes/comercial/Due)
  NewClientModal.tsx Botón + modal "New Client" (acepta presetAssignedTo)
  actions.ts     Todas las Server Actions
  login/         page.tsx (form) + actions.ts (signIn/signOut)
  home/          page.tsx  Landing al pinchar el logo (stats + tarjetas de secciones)
  dashboard/     page.tsx (managers: analytics; sales: <SalesDashboard/> personal)
                 SalesDashboard.tsx (dashboard personal del comercial)
  pipeline/      page.tsx + KanbanBoard.tsx (8 etapas, drag&drop)
  team/          page.tsx (lista comerciales) + [slug]/ (page + TeamMemberView.tsx)
  documents/     page.tsx (managers) + DocumentsClient.tsx (subida/lista)
  clients/[id]/  page.tsx + ClientDetail.tsx (ficha; contiene ProjectCard, QuotesSection,
                 FilesSection, historial, contacto rápido WhatsApp/call/email)
  quotes/[id]/   page.tsx + QuotePrint.tsx (documento imprimible / guardar como PDF)
  components/    NavLinks.tsx, ThemeToggle.tsx, Logo.tsx
public/          logo.png, logo-dark.png (logos reales, jpeg convertidos; el PDF usa /logo.png)
```

---

## 6. Modelo de datos (Supabase — TODAS las migraciones ya aplicadas)

Tablas (RLS deshabilitada en todas):
- **clients**: id, name, phone, email, location, property_type
  (villa/apartment/office/other), `renovation_type` (texto libre), lead_source
  (referral/instagram/other), assigned_to (comercial que gestiona), `captured_by`
  (quién captó el lead), `captured_at` (fecha), `next_follow_up` (fecha), notes, created_at
- **projects**: id, client_id, name, description, budget, status
  (active/completed/on-hold), pipeline_stage (1..8), start_date, end_date, contractor,
  team_members (jsonb string[]), suppliers (jsonb {name,material}[]), approved (bool),
  approved_by, approved_at, created_at
- **activities**: id, client_id, project_id (nullable → null = historial del cliente;
  con valor = historial del proyecto), type
  (note/client_updated/project_created/project_updated/stage_changed), description, created_at
- **quotes**: id, project_id, client_id, number (Q-YYYY-NNNN), status
  (draft/sent/accepted/rejected), issue_date, valid_until, vat_rate (default 5),
  notes, items (jsonb {description,qty,unitPrice}[]), sent_at, created_at
- **project_files**: id, project_id, client_id, name, path, mime, size, category
  (render/receipt/document/other), uploaded_by, created_at
- **documents** (empresa, managers): id, name, path, mime, size, uploaded_by, created_at
- **profiles**: id (=auth.users.id), full_name, role (manager/sales), created_at
- Trigger `handle_new_user` en auth.users crea el perfil al registrarse (blindado con
  SET search_path=public + EXCEPTION para no bloquear nunca el alta).

Storage buckets (privados): **company-docs**, **project-files**. Descargas vía signed URLs
(3600s) generadas en servidor.

Personas:
- **Managers** (ven todo, tienen Dashboard analítico + Team + Docs): **Eduardo**, **Sergio**
  (studio@serviancontracting.com).
- **Comerciales** (SALESPEOPLE, ven solo lo suyo): **Joana, Alfie, Elsayed, Faizan**.
  (aún sin cuentas creadas salvo pruebas; se crean en Supabase Auth y se pone
  `profiles.full_name` = nombre exacto).
- **CAPTURERS** (para "captado por") = los 4 comerciales + Eduardo + Sergio.

---

## 7. Convenciones y decisiones técnicas CLAVE (no las rompas)

1. **Tailwind v4 — sintaxis de variables**: usa **`bg-(--accent)`** con PARÉNTESIS, nunca
   `bg-[--accent]` con corchetes (roto en v4; toda la app se rompió por esto y se arregló
   convirtiendo ~211 clases). Para clases de tema usa las variables CSS existentes
   (`--background`, `--surface`, `--card`, `--border`, `--accent`, `--text-primary/secondary/muted`).
2. **Modo claro/oscuro por CLASE**: `globals.css` tiene `@custom-variant dark (&:where(.dark, .dark *))`.
   El tema se aplica con la clase `.dark` en `<html>` (ThemeToggle + script anti-flash en layout,
   persistido en localStorage, default dark). Colores duales: `bg-white dark:bg-zinc-900`, etc.
3. **`proxy.ts`, no `middleware.ts`**: Next 16 renombró middleware→proxy. El archivo exporta
   `export async function proxy(request)`.
4. **Botones de acento**: `bg-(--accent) text-white dark:text-black` (el acento es más oscuro
   en claro y más brillante en oscuro; el texto se invierte para contraste).
5. **Escrituras/lecturas resilientes** ante columnas/tablas que puedan faltar: `getClient`
   reintenta sin `quotes` si falla; `updateClient`/`createClient` reintentan sin
   `next_follow_up`. Esto permite desplegar ANTES de correr el SQL sin romper producción.
   Mantén ese patrón si añades columnas nuevas a `clients`.
6. **Money en móvil**: NO uses `AED 1,234,567` como valor grande (se sale). Pon la unidad en
   la etiqueta ("Pipeline · AED") y el número formateado como valor.
7. **Optimistic UI**: `ClientDetail` y las secciones mantienen estado local y actualizan al
   instante; las Server Actions persisten + `revalidatePath`. Al crear objetos optimistas de
   Project hay que incluir TODOS los campos nuevos (activities, quotes, files, approved, etc.)
   o TypeScript falla.
8. **Estilo**: componentes funcionales, comentarios escuetos en inglés, mismo patrón que el
   código existente (mira ClientsTable/ClientDetail antes de crear UI nueva).

---

## 8. Cómo trabajar (flujo operativo)

- **Comprobar tipos** (no hay test runner): `node_modules/.bin/tsc -p tsconfig.json --noEmit`
  (ejecútalo con ruta absoluta; el cwd del shell puede resetearse).
- **Desplegar**: `git add -A && git commit && git push origin main` → Vercel despliega solo
  en ~2 min. La identidad git ya está configurada (edualbenito-design). Termina los mensajes
  de commit con `Co-Authored-By: Claude ...`.
- **DDL (CREATE/ALTER/DROP TABLE)**: NO se puede hacer desde el agente (no hay password de la
  DB). Dale al usuario el SQL para pegar en Supabase → SQL Editor. Si la columna es en `clients`,
  hazlo resiliente (§7.5) para poder desplegar antes de que corra el SQL.
- **SÍ se puede** con la service key vía API REST/Storage/Auth-admin: insert/update/delete de
  datos, crear buckets de Storage, crear/borrar usuarios de Auth, generar signed URLs. (Se usa
  un pequeño script node con fetch + .env.local — ver historial de comandos.)
- **Verificación en navegador**: ⚠️ el login del entorno de PREVIEW (Claude Preview) NO
  persiste la sesión (cookies) — no intentes verificar pantallas autenticadas ahí, se queda en
  /login. Las páginas públicas (login) sí se pueden ver. La verificación real de pantallas
  autenticadas es en **la web de Vercel** (el usuario lo prueba en su móvil/PC). Confía en tsc
  + revisión de código para lo autenticado.

---

## 9. Estado actual — FUNCIONALIDADES TERMINADAS

- CRM: lista de clientes (tabla en desktop, tarjetas en móvil), **buscador**, filtros
  (mes de captación / comercial / "Due" seguimientos), stats.
- **Crear cliente manual** (New Client), con captado por / gestionado por / renovación /
  fecha de captación / próximo seguimiento.
- Ficha de cliente: editar todo, **contacto rápido WhatsApp/Llamar/Email**, panel de detalles.
- **Proyectos** (acordeón): equipo, contractor, proveedores; historial por proyecto y por
  cliente; **visto bueno de manager** (aprobar/revocar).
- **Cotizaciones** por proyecto: líneas + 5% VAT, número Q-AÑO-NNNN, estados
  (draft/sent/accepted/rejected), **PDF imprimible con formato de la factura real** (logo,
  datos de empresa, banco WIO — en `lib/company.ts`).
- **Archivos por proyecto** (renders/comprobantes/docs) → Supabase Storage.
- **Pipeline Kanban** 8 etapas con drag & drop.
- **Login con roles** (managers vs comerciales), protección de rutas.
- **Dashboard**: managers = analítica global (KPIs, leads por mes, funnel, fuentes,
  rendimiento por comercial, duración por tamaño); **comerciales = dashboard personal**
  (SalesDashboard: sus KPIs, lista de seguimientos del día con WhatsApp, su pipeline).
- **Team** (managers): stats por comercial + ficha por comercial con filtros y botón
  "New lead for [nombre]".
- **Documentos de empresa** (managers): subir/descargar licencias, etc.
- **Home** al pinchar el logo (landing con stats + tarjetas de secciones).
- **Tema claro/oscuro**, **logo SVG** (fondo transparente, en cabecera y login), **responsive móvil**.
- Desplegado en Vercel, dos buckets de Storage privados.

---

## 10. Tareas pendientes (priorizadas)

1. **Revisión final de móvil** por el usuario (probar en su teléfono en Vercel y reportar
   pantallas apretadas). El grueso del responsive ya está hecho.
2. **Integrar el logo real en el PDF**: `QuotePrint.tsx` ya intenta `/logo.png`; si el logo
   real con fondo no queda bien, el usuario puede pasar un PNG con fondo transparente.
3. **Aviso automático 9am** de seguimientos: requiere servicio de email (Resend) + tarea
   programada (Vercel Cron). Es "el siguiente nivel" de la agenda; la base (next_follow_up +
   lista en dashboard) ya existe.
4. **Estados de pago / facturas** (a partir de cotizaciones aceptadas): marcar pagos,
   generar factura, guardar comprobante (ya hay archivos por proyecto).
5. **Captación RRSS**: campos de campaña/UTM en el lead + intake a un pool genérico
   (assigned_to = "Unassigned") + auto-asignación round-robin futura (por ahora manual).
6. Crear cuentas reales de los 4 comerciales cuando el usuario tenga sus emails
   (Auth → Add user, luego `UPDATE profiles SET full_name='<nombre exacto>'`).

---

## 11. Problemas conocidos y cómo se resolvieron

- **Tailwind v4 corchetes** `bg-[--x]` no funcionan → convertido todo a `bg-(--x)`.
- **middleware deprecado en Next 16** → renombrado a `proxy.ts` / función `proxy`.
- **Trigger `handle_new_user` rompía la creación de usuarios** ("Database error creating new
  user") → reescrito blindado (SET search_path + EXCEPTION) + red de seguridad: el perfil
  también se crea en `getCurrentProfile` al primer login.
- **Barras del gráfico "Leads by month" no crecían** → el % de altura no tenía contenedor de
  referencia; se cambió a altura en **px** calculada.
- **Números de dinero se salían del cuadro en móvil** → unidad a la etiqueta.
- **Team: recuadros se solapaban con el nombre** → layout apilado (nombre arriba, grid abajo).
- **"Joana 0 proyectos"**: no era bug — su cliente no tenía proyecto. Team ahora muestra
  también nº de clientes asignados.
- **Preview login no persiste sesión** → verificar en Vercel (ver §8).

---

## 12. Reglas de interacción con el usuario

- Español, tono cercano, explica en simple. El usuario no programa.
- Antes de construir algo grande, confirma el enfoque; propón ideas ("director creativo").
- Al terminar cada bloque: desplegar, dar el SQL si hace falta, y decir "qué probar".
- No rompas producción: si una escritura necesita columna nueva, hazla resiliente (§7.5) y
  entrega el SQL para que el usuario lo corra.
```
