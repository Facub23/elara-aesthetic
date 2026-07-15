# Prelaunch Audit Report

Fecha: 2026-07-15

## Estado general

EncuentraTuClinica esta en base limpia y preparada para empezar carga de contenido real.

Validaciones ejecutadas:

- `npm run env:check`: OK.
- `npm run lint -- --quiet`: OK.
- `npm run build`: OK.
- `npm run smoke:deploy -- https://encuentratuclinica-esp.vercel.app`: OK.

## Supabase

Contenido real/demo actualmente vacio:

| Tabla | Filas |
| --- | ---: |
| `clinics` | 0 |
| `specialists` | 0 |
| `treatments` | 0 |
| `bookings` | 0 |
| `reviews` | 0 |
| `commission_rules` | 0 |
| `specialist_availability` | 0 |
| `treatment_durations` | 0 |
| `specialist_google_calendar_connections` | 0 |

Configuracion preservada:

| Tabla | Filas |
| --- | ---: |
| `admin_users` | 5 |
| `email_templates` | 7 |
| `app_settings` | 1 |

La migracion de comisiones personalizadas esta aplicada y la tabla `commission_rules` responde correctamente.

## Produccion

Smoke test en Vercel:

- `/`: 200.
- `/clinics`: 200.
- `/tratamientos`: 200.
- `/especialistas`: 200.
- `/privacidad`: 200.
- `/terminos`: 200.
- `/aviso-legal`: 200.
- `/cookies`: 200.
- `/sitemap.xml`: 200.
- `/robots.txt`: 200.
- `/api/public-marketplace-data`: 200 con `clinics: 0`, `specialists: 0`, `reviews: 0`.

Rutas privadas/sensibles:

- `/admin`: redirige y mantiene `noindex, nofollow`.
- `/login`: `noindex, nofollow`.
- `/mi-cuenta`: `noindex, nofollow`.
- `/dashboard`: redirige y mantiene `noindex, nofollow`.
- `/cancel-booking`: `noindex, nofollow`.
- `/confirm-booking`: redirige y mantiene `noindex, nofollow`.
- `/api/public-marketplace-data`: `noindex, nofollow`.

Crons protegidos:

- `/api/expire-pending-bookings`: 401 sin secreto.
- `/api/send-booking-reminders`: 401 sin secreto.
- `/api/auto-complete-bookings`: 401 sin secreto.

## Admin

Estado:

- Panel admin protegido por login.
- Finanzas tiene comisiones personalizadas por clinica o especialista.
- No existe comision global.
- Si una clinica o especialista no tiene regla de comision, no se calcula comision.
- El bloque de notas de carga final esta en `docs/PRELAUNCH_CONTENT_NOTES.md`.
- El checklist general esta en `docs/PRELAUNCH.md`.

Pendiente para revisar con contenido real:

- Permisos por rol usando clinicas/especialistas reales.
- Panel de mi clinica con una clinica real asignada.
- Panel de especialista independiente con un especialista real asignado.
- Panel de especialista de clinica limitado solo a su agenda/pacientes.
- Calendario con reservas reales.
- Finanzas con reglas reales.

## Publico

Estado:

- Home responde sin contenido demo.
- Listados publicos responden con base vacia.
- Paginas legales existen.
- SEO tecnico basico responde: sitemap y robots OK.

Pendiente con contenido real:

- Validar home con clinicas reales.
- Validar listados de tratamientos, clinicas y especialistas.
- Validar landing de tratamiento con especialistas disponibles.
- Validar especialistas independientes con direccion propia.
- Validar fichas individuales.
- Validar flujo completo de reserva publica.

## Antes de cargar contenido real

No hace falta construir mas para empezar carga real. Lo siguiente es preparar los datos:

1. Tratamientos reales.
2. Clinicas reales.
3. Especialistas de clinica.
4. Especialistas independientes.
5. Tratamientos por especialista.
6. Precio por tratamiento y especialista.
7. Duracion por tratamiento y especialista.
8. Disponibilidad semanal por especialista.
9. Descansos, buffers, bloqueos y vacaciones.
10. Comision personalizada por clinica o especialista.

## Riesgos pendientes de pre-lanzamiento

1. Pagos reales todavia no estan activos.
2. Crons en Vercel Hobby son diarios; para operacion real conviene Vercel Pro o cron externo.
3. Legal final debe completarse con razon social, NIF/CIF, domicilio, politica de reembolso y textos definitivos.
4. Google Calendar debe probarse con cuentas reales de especialistas.
5. Emails deben probarse con datos reales y dominio/remitente definitivo.

## Conclusion

Estado actual: listo para pasar a carga de contenido real controlada.

No se recomienda seguir agregando features grandes antes de cargar una primera muestra real. La siguiente fase debe ser carga de datos, prueba del flujo completo y pequenos ajustes derivados de contenido real.
