# Guia de carga de datos reales

Esta guia define el orden y los campos necesarios para cargar datos reales en EncuentraTuClinica sin romper filtros, relaciones, reservas, SEO ni el panel admin.

Usarla cuando el proyecto ya este tecnicamente listo y falte reemplazar datos demo por contenido final.

## Principio base

No cargar datos reales de forma aislada. En este marketplace cada entidad afecta a otras:

- Una clinica necesita tratamientos y especialistas conectados.
- Un especialista necesita tratamientos con precio y disponibilidad.
- Un tratamiento necesita duracion, descripcion SEO y especialistas disponibles.
- Una reserva depende de especialista, tratamiento, horario, duracion, buffer y bloqueos.

## Orden correcto de carga

1. Limpiar u ocultar datos demo.
2. Cargar tratamientos base.
3. Cargar duraciones por tratamiento.
4. Cargar clinicas.
5. Cargar especialistas con clinica.
6. Cargar especialistas independientes.
7. Asociar tratamientos y precios por especialista.
8. Cargar horarios semanales por especialista.
9. Cargar descansos, vacaciones, bloqueos y limites diarios.
10. Revisar fichas publicas y SEO.
11. Conectar Google Calendar por especialista cuando aplique.
12. Probar flujo completo de reserva con datos reales.

## 1. Limpieza de datos demo

Antes de publicar:

- Eliminar o despublicar registros con nombres tipo `demo`, `test`, `qa`, `prueba`.
- Revisar clinicas, especialistas, reservas, reviews, pacientes, notas y logs visibles.
- Mantener usuarios QA solo si quedan claramente fuera de operacion real.
- Confirmar que `/api/public-marketplace-data` devuelve solo contenido apto para publico.

## 2. Tratamientos

Los tratamientos son la base de filtros, SEO programatico y fichas landing.

Campos obligatorios:

- Nombre publico del tratamiento.
- Slug limpio y estable.
- Descripcion clara.
- Imagen principal.
- Duracion por defecto.

Campos recomendados:

- Beneficios principales.
- Zonas tratadas.
- Para quien es.
- Que esperar.
- Cuidados posteriores.
- Preguntas frecuentes.
- Rango de precio orientativo si aplica.

Checklist:

- El slug no cambia despues de publicar.
- El tratamiento aparece en `/tratamientos`.
- La ficha `/tratamientos/[slug]` tiene contenido suficiente.
- Existe duracion en `treatment_durations`.
- Al menos un especialista lo ofrece antes de publicarlo como activo.

## 3. Clinicas

Las clinicas alimentan `/clinics`, fichas individuales, filtros locales y perfiles de especialistas con clinica.

Campos obligatorios:

- Nombre comercial.
- Slug.
- Ciudad.
- Pais.
- Imagen principal real.
- Descripcion.
- Rating inicial si se usa.
- Tratamientos ofrecidos.

Campos recomendados:

- Direccion completa.
- Barrio o zona.
- Telefono.
- Email.
- WhatsApp.
- Web.
- Horarios generales.
- Especialidades destacadas.
- Galeria de imagenes.
- Texto premium de confianza: certificaciones, equipo, experiencia.

Checklist:

- El slug coincide con la URL deseada.
- La ciudad esta normalizada para SEO local.
- La imagen no es generica ni oscura.
- Los tratamientos existen tambien en el catalogo.
- Cada especialista asociado tiene `clinic_id` o `clinic_name` correcto.
- La ficha `/clinics/[slug]` muestra tratamientos y especialistas.

## 4. Especialistas con clinica

Este rol representa profesionales que trabajan dentro de una clinica.

Campos obligatorios:

- Nombre completo.
- Slug.
- Especialidad.
- Imagen profesional.
- Bio publica.
- Clinica asociada.
- Tratamientos ofrecidos.
- Precio por tratamiento.

Campos recomendados:

- Numero de colegiado o credenciales, si aplica.
- Experiencia.
- Idiomas.
- Formacion destacada.
- Enfoque estetico.
- Rating/reviews cuando existan.

Reglas:

- Deben tener clinica asociada.
- No deben usar `consultation_address` como ubicacion principal.
- El admin especialista de clinica solo vera su agenda y sus pacientes.
- El manager de clinica podra ver contenido y operaciones de su clinica.

Checklist:

- El especialista aparece en la clinica correcta.
- El especialista no aparece como independiente.
- Todos sus tratamientos existen en catalogo.
- Cada tratamiento tiene precio orientativo.
- Tiene disponibilidad activa antes de aceptar reservas.

## 5. Especialistas independientes

Son profesionales que atienden por cuenta propia sin clinica registrada en la plataforma.

Campos obligatorios:

- Nombre completo.
- Slug.
- Especialidad.
- Imagen profesional.
- Bio publica.
- Direccion de atencion (`consultation_address`).
- Tratamientos ofrecidos.
- Precio por tratamiento.

Campos recomendados:

- Ciudad visible dentro de la direccion.
- Zona o barrio.
- Indicaciones breves de atencion.
- Credenciales.
- Politica de cancelacion propia si aplica.

Reglas:

- No deben tener `clinic_id`.
- No deben tener `clinic_name`.
- Deben tener `consultation_address`.
- Su admin independiente puede editar su propio perfil/contenido, ver reservas, pacientes, notificaciones y agenda.

Checklist:

- Aparece como consulta independiente.
- La direccion es clara para el paciente.
- El perfil tiene CTA de reserva.
- Los filtros por ciudad/tratamiento lo encuentran.
- Tiene disponibilidad real configurada.

## 6. Tratamientos y precios por especialista

El campo de tratamientos del especialista debe incluir objetos con nombre y precio cuando sea posible.

Formato recomendado:

```json
[
  { "name": "Botox", "price": "Desde 290 EUR" },
  { "name": "Acido hialuronico", "price": "Desde 350 EUR" }
]
```

Reglas:

- El nombre debe coincidir con un tratamiento del catalogo.
- El precio debe ser orientativo y legible.
- Evitar precios vacios en perfiles finales.
- Si un precio cambia, actualizar tambien textos publicos relacionados si existen.

Checklist:

- El tratamiento aparece en la ficha del especialista.
- El precio aparece en marketplace/fichas.
- La landing del tratamiento muestra especialistas disponibles.
- La reserva usa la duracion correcta.

## 7. Disponibilidad

La disponibilidad real vive por especialista.

Campos obligatorios por dia activo:

- Especialista.
- Dia de la semana.
- Hora inicio.
- Hora fin.
- Estado activo.

Campos recomendados:

- Descanso inicio.
- Descanso fin.
- Limite diario.
- Intervalo de slot.

Valores recomendados prelaunch:

- Buffer global: 15 minutos.
- Limite diario inicial: 8 reservas.
- Intervalo de slot: 30 minutos.
- Duracion por tratamiento: segun catalogo.

Checklist:

- Al menos un dia activo por especialista publicado.
- El descanso queda dentro del horario.
- El sistema no ofrece horas durante descanso.
- El sistema no ofrece horas bloqueadas.
- El sistema respeta duracion + buffer.
- El paciente no puede reservar dos veces el mismo hueco.

## 8. Bloqueos y vacaciones

Usar para excepciones reales:

- Vacaciones por rango de fechas.
- Dia bloqueado completo.
- Bloqueo por tramo horario.

Checklist:

- Bloqueos aparecen en calendario admin.
- No aparecen slots publicos en fechas bloqueadas.
- Vacaciones largas no dejan huecos disponibles.
- Reprogramar tambien respeta bloqueos.

## 9. Reviews

No inventar reviews reales.

Antes de lanzamiento:

- Dejar reviews demo fuera de produccion o marcadas como no aprobadas.
- Usar solo reviews verificadas por reserva.
- Revisar que la solicitud de review se envia despues de cita completada.

Checklist:

- Reviews publicas tienen estado aprobado.
- Estan asociadas a clinica o especialista correcto.
- No contienen datos medicos sensibles.

## 10. Imagenes

Requisitos recomendados:

- Imagen principal de clinica: horizontal, luminosa, real.
- Imagen de especialista: retrato profesional.
- Imagen de tratamiento: realista y premium, sin ser invasiva.
- Evitar stock generico oscuro o borroso.

Checklist:

- Todas las fichas publicas tienen imagen.
- No hay imagenes rotas.
- Las imagenes cargan en mobile.
- El encuadre permite ver el sujeto principal.

## 11. SEO y slugs

Reglas:

- No cambiar slugs despues de indexar.
- Usar nombres claros y buscables.
- Tratamientos deben tener contenido suficiente para landing.
- Ciudad + tratamiento debe funcionar para rutas tipo `/madrid/botox`.

Checklist:

- `/sitemap.xml` incluye paginas publicas importantes.
- `/robots.txt` permite indexar paginas publicas.
- Rutas privadas tienen `noindex`.
- No hay paginas publicas con contenido demo.

## 12. Orden de validacion por entidad

Para cada clinica:

1. Abrir ficha publica.
2. Revisar imagen, ciudad, descripcion y tratamientos.
3. Confirmar especialistas vinculados.
4. Confirmar CTAs correctos.

Para cada especialista:

1. Abrir ficha publica.
2. Revisar bio, imagen, tratamiento y precio.
3. Confirmar ubicacion: clinica o direccion independiente.
4. Revisar disponibilidad publica.
5. Crear una reserva de prueba despues de cargar datos reales.

Para cada tratamiento:

1. Abrir landing.
2. Revisar descripcion y secciones.
3. Confirmar especialistas disponibles.
4. Confirmar precios orientativos.
5. Confirmar rutas ciudad + tratamiento.

## 13. Prueba final tras carga real

Cuando todo este cargado:

1. Ejecutar `npm run env:check`.
2. Ejecutar `npm run build`.
3. Ejecutar `npm run smoke:deploy -- https://encuentratuclinica-esp.vercel.app`.
4. Crear reserva real de prueba.
5. Confirmar email de solicitud.
6. Confirmar reserva por enlace.
7. Reprogramar por enlace de gestion.
8. Cancelar por enlace de gestion.
9. Revisar admin como superadmin.
10. Revisar admin como clinica.
11. Revisar admin como especialista de clinica.
12. Revisar admin como especialista independiente.

## Criterio de listo

La carga real esta lista cuando:

- No queda contenido demo visible.
- Cada tratamiento tiene especialistas disponibles.
- Cada especialista publicado tiene disponibilidad activa.
- Cada ficha tiene imagen real.
- Las relaciones clinica-especialista-tratamiento son coherentes.
- El flujo de reserva funciona con email real.
- El admin muestra solo datos segun rol.
- Smoke deploy pasa en produccion.
