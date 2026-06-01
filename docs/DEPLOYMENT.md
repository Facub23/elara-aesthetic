# EncuentraTuClinica Deployment

Guia corta para publicar una version de prueba o produccion sin cargar todavia los datos reales definitivos.

## 1. Variables en Vercel

Configurar estas variables en Project Settings > Environment Variables:

| Variable | Obligatoria | Nota |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Si | Dominio final o URL publica temporal, sin barra final. |
| `NEXT_PUBLIC_SUPABASE_URL` | Si | URL publica del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Si | Anon key publica. |
| `SUPABASE_SERVICE_ROLE_KEY` | Si | Solo servidor. No exponer en cliente. |
| `RESEND_API_KEY` | Si | Envio de emails transaccionales. |
| `EMAIL_FROM` | Si | Remitente verificado en Resend. |
| `CRON_SECRET` | Si | Secreto largo para proteger crons. |
| `ENCUENTRA_BOOKING_TIMEZONE` | Si | Usar `Europe/Madrid`. |
| `ADMIN_EMAIL` | Recomendado | Avisos internos si no hay email en ajustes. |
| `ENCUENTRA_BOOKING_BUFFER_MINUTES` | Recomendado | Buffer global entre citas. |
| `ENCUENTRA_MAX_DAILY_BOOKINGS` | Recomendado | `0` significa sin limite global. |
| `ENCUENTRA_BOOKING_COMPLETION_GRACE_MINUTES` | Recomendado | Margen antes de marcar cita como completada. |

Validar localmente antes de desplegar:

```bash
npm run env:check
```

Validar un archivo concreto de variables para Vercel:

```bash
npm run env:check -- --file .env.vercel.local
```

El comando falla si falta una variable obligatoria o si el dominio sigue apuntando a localhost.

## 2. Crons

El archivo `vercel.json` registra estos jobs:

| Endpoint | Frecuencia | Objetivo |
| --- | --- | --- |
| `/api/expire-pending-bookings` | Cada 5 minutos | Libera reservas no confirmadas. |
| `/api/send-booking-reminders` | Cada 15 minutos | Envia recordatorios 24h y 2h. |
| `/api/auto-complete-bookings` | Cada 30 minutos | Marca citas pasadas como completadas y pide review. |

En Vercel, al configurar `CRON_SECRET`, las invocaciones programadas reciben automaticamente `Authorization: Bearer <CRON_SECRET>`.

## 3. Supabase

Antes de abrir al publico:

1. Ejecutar todas las migraciones en orden.
2. Confirmar RLS activo en tablas sensibles.
3. Revisar bucket `clinic-images`.
4. Crear o confirmar el primer `super_admin`.
5. Validar que el service role solo este en Vercel, nunca en navegador.

## 4. Smoke test publico

Despues del deploy:

Ejecutar:

```bash
npm run smoke:deploy -- https://tu-url-publica
```

Por defecto el smoke test no ejecuta crons; solo comprueba que esten protegidos con `401`.

Si quieres ejecutar crons contra datos de prueba y validar que aceptan el secreto:

```bash
CRON_SECRET=tu_secreto npm run smoke:deploy -- https://tu-url-publica --with-crons
```

Revisar manualmente:

1. Abrir home.
2. Abrir `/clinics`, `/tratamientos`, `/especialistas`.
3. Crear una reserva desde ficha publica.
4. Confirmar por enlace de email.
5. Reprogramar por enlace de gestion.
6. Cancelar por enlace de gestion.
7. Entrar a `/admin`.
8. Revisar `/admin/configuracion`.
9. Revisar `/admin/notificaciones`.
10. Revisar `/sitemap.xml` y `/robots.txt`.

## 5. Antes de datos reales

Mantener pagos en modo simulacion hasta decidir el modelo comercial. Cargar datos reales al final, cuando el flujo tecnico, emails, crons y admin esten validados en la URL publica.
