# EncuentraTuClinica

Marketplace premium de medicina estetica en Espana construido con Next.js App Router, TypeScript, Tailwind y Supabase.

La plataforma conecta pacientes con clinicas verificadas, especialistas, tratamientos, disponibilidad real, reservas, emails transaccionales, panel admin y SEO programatico.

## Estado actual

- Web publica con home, clinicas, especialistas y tratamientos.
- Fichas dinamicas de clinica, especialista y tratamiento.
- Booking modal con disponibilidad real por especialista.
- Reservas, confirmacion, cancelacion y reprogramacion.
- Panel admin con calendario, reservas, clinicas, especialistas, tratamientos, pacientes, emails, reviews, finanzas y configuracion.
- Roles de super admin, admin de clinica y especialista.
- Emails transaccionales con Resend.
- Google Calendar preparado para conexion por especialista.
- SEO publico con sitemap, robots y rutas privadas marcadas como `noindex`.
- Smoke test de despliegue para validar Vercel.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth, Database y Storage
- Resend
- Vercel

## Desarrollo local

Instalar dependencias:

```bash
npm install
```

Configurar variables:

```bash
cp .env.example .env.local
```

Arrancar:

```bash
npm run dev
```

Abrir:

```text
http://localhost:3000
```

## Scripts utiles

```bash
npm run build
```

Compila produccion y valida TypeScript.

```bash
npm run lint
```

Ejecuta ESLint.

```bash
npm run env:check
```

Valida variables obligatorias en `.env.local`.

```bash
npm run env:check -- --file .env.vercel.local
```

Valida un archivo concreto de variables para Vercel.

```bash
npm run smoke:deploy -- https://encuentratuclinica-esp.vercel.app
```

Valida rutas publicas, sitemap, robots, APIs, crons protegidos y headers `noindex` en rutas privadas.

## Variables principales

Ver [.env.example](./.env.example) para la plantilla completa.

Obligatorias para produccion:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET`
- `ENCUENTRA_BOOKING_TIMEZONE`

Recomendadas antes del lanzamiento final:

- `ADMIN_EMAIL`
- `ENCUENTRA_BOOKING_BUFFER_MINUTES`
- `ENCUENTRA_MAX_DAILY_BOOKINGS`
- `ENCUENTRA_BOOKING_COMPLETION_GRACE_MINUTES`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ENCUENTRA_BILLING_MODEL`

## Despliegue

La guia de despliegue esta en [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

Resumen:

1. Configurar variables en Vercel.
2. Ejecutar migraciones de Supabase.
3. Confirmar RLS y Storage.
4. Desplegar desde `main`.
5. Ejecutar `npm run smoke:deploy -- <url>`.
6. Revisar el checklist de `/admin/configuracion`.

## Pre-lanzamiento

El checklist operativo esta en [docs/PRELAUNCH.md](./docs/PRELAUNCH.md).

La guia para cargar datos reales esta en [docs/DATA_LOADING_GUIDE.md](./docs/DATA_LOADING_GUIDE.md).

Lo ultimo antes de publicar debe ser:

1. Decidir modelo de pagos.
2. Configurar dominio final.
3. Revisar crons reales.
4. Cargar datos reales de clinicas, tratamientos, especialistas, precios, horarios e imagenes.
5. Probar el flujo completo en produccion.

## Crons

En `vercel.json` hay crons diarios compatibles con Vercel Hobby:

- `/api/send-booking-reminders`
- `/api/auto-complete-bookings`
- `/api/expire-pending-bookings`

Para operacion real con pacientes, usar Vercel Pro o un cron externo con frecuencias mas altas. Ver [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Nota sobre datos de prueba

El proyecto contiene datos demo para validar UX, reservas y admin. Antes del lanzamiento real se deben borrar u ocultar registros marcados como `demo`, `prueba`, `test` o `QA`.
