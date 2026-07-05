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

## ⏳ Pendiente / siguientes pasos
- [ ] **Desplegar a URL pública (Vercel)** — siguiente hito
- [ ] Crear las cuentas reales cuando haya emails: 4 comerciales (rol sales, full_name exacto) + Sergio (manager)
- [ ] Estructura para leads de RRSS (campos de campaña/UTM) + pool genérico → asignación (manual ahora, round-robin igualitario futuro)
- [ ] Adjuntar archivos/fotos por proyecto (presupuestos, planos, fotos del sitio)
- [ ] Estados de pago / facturas / comprobantes
- [ ] Botón de WhatsApp directo por cliente
- [ ] Recordatorios / próxima acción + briefing diario 9am
- [ ] Desplegar a una URL pública (Vercel) para uso multi-dispositivo

## 🗄️ Migraciones SQL pendientes de ejecutar en Supabase
- [ ] Columnas de aprobación en projects (ver mensaje del chat):
  ```sql
  ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS approved_by text,
    ADD COLUMN IF NOT EXISTS approved_at timestamptz;
  ```
- [ ] Trigger blindado de creación de perfiles (ver mensaje del chat)
