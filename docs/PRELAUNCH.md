# EncuentraTuClinica Prelaunch

Checklist operativo para dejar la plataforma lista antes de cargar datos reales.

Guia de despliegue: [DEPLOYMENT.md](./DEPLOYMENT.md)

## Variables obligatorias

- `NEXT_PUBLIC_SITE_URL`: dominio publico definitivo, sin barra final.
- `NEXT_PUBLIC_SUPABASE_URL`: URL publica de Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key publica de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: service role solo en servidor.
- `RESEND_API_KEY`: envio de emails transaccionales.
- `EMAIL_FROM`: remitente verificado.
- `CRON_SECRET`: secreto para endpoints programados.
- `ENCUENTRA_BOOKING_TIMEZONE`: recomendado `Europe/Madrid`.

## Variables recomendadas

- `ADMIN_EMAIL`: receptor de avisos internos si no existe email en ajustes.
- `ENCUENTRA_BOOKING_BUFFER_MINUTES`: buffer entre citas.
- `ENCUENTRA_MAX_DAILY_BOOKINGS`: limite diario global si no hay limite por especialista.
- `ENCUENTRA_BOOKING_COMPLETION_GRACE_MINUTES`: margen para marcar citas pasadas como completadas.
- `GOOGLE_CLIENT_ID`: OAuth para Google Calendar.
- `GOOGLE_CLIENT_SECRET`: OAuth para Google Calendar.
- `ENCUENTRA_BILLING_MODEL`: mantener `simulation` hasta decidir pagos.
- `ENCUENTRA_COMMISSION_RATE`: comision si se usa modelo porcentual.

## Pagos

Mantener Finanzas en modo simulacion hasta decidir:

- Comision por cita completada.
- Suscripcion por clinica.
- Lead verificado.
- Modelo mixto.

Antes de activar cobros reales faltan:

- Proveedor de pagos.
- Webhook de cobros.
- Politica de reembolsos o cancelaciones.
- Datos fiscales y facturacion.

## Legal

Ya existen paginas base para pre-lanzamiento:

- `/privacidad`
- `/terminos`
- `/aviso-legal`
- `/cookies`

Antes de publicar con datos reales faltan:

- Revision juridica final.
- Razon social, NIF/CIF, domicilio y datos registrales.
- Politica definitiva de cancelacion/reembolso.
- Banner y preferencias de cookies si se activan analiticas o marketing.
- Textos finales adaptados a RGPD y al modelo comercial elegido.

## Pruebas antes de publicar

1. `npm run lint -- --quiet`
2. `npm run build`
3. Revisar `/admin/configuracion`.
4. Revisar `/admin/finanzas`.
5. Crear reserva desde ficha publica.
6. Confirmar reserva por enlace de email.
7. Reprogramar desde email de gestion.
8. Cancelar desde email de gestion.
9. Verificar recordatorios por email.
10. Verificar sitemap y robots:
    - `/sitemap.xml`
    - `/robots.txt`
11. Revisar paginas legales:
    - `/privacidad`
    - `/terminos`
    - `/aviso-legal`
    - `/cookies`
12. Verificar que rutas privadas devuelven `X-Robots-Tag: noindex, nofollow`:
    - `/admin`
    - `/login`
    - `/mi-cuenta`
    - `/dashboard`
    - `/api/public-marketplace-data`

## Tareas programadas

Configurar estos jobs en el hosting o proveedor de cron cuando el dominio real este listo. Todos deben enviar:

`Authorization: Bearer <CRON_SECRET>`

| Endpoint | Frecuencia recomendada | Objetivo |
| --- | --- | --- |
| `/api/expire-pending-bookings` | Cada 5 minutos | Caducar reservas pendientes que no fueron confirmadas a tiempo. |
| `/api/send-booking-reminders` | Cada 15 minutos | Enviar emails de recordatorio 24h y 2h antes de la cita. |
| `/api/auto-complete-bookings` | Cada 30 minutos | Marcar citas pasadas como completadas y disparar solicitud de review. |

No publicar sin `CRON_SECRET` configurado en produccion. En desarrollo estos endpoints pueden ejecutarse con sesion admin, pero en produccion deben ir protegidos por el secreto.

Nota: Vercel Hobby solo permite crons diarios. Eso alcanza para demo, pero para operacion real usar Vercel Pro o un cron externo con las frecuencias recomendadas.

## Datos reales

Cargar datos reales al final, en este orden:

1. Clinicas.
2. Tratamientos.
3. Especialistas.
4. Relacion clinica-especialista.
5. Tratamientos y precios por especialista.
6. Disponibilidad semanal por especialista.
7. Bloqueos, vacaciones y limites diarios.
8. Plantillas de email finales.
