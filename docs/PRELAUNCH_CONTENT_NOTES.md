# Bloque de notas pre-lanzamiento

Lista practica para cargar contenido real cuando la plataforma ya este validada.

## Datos principales

1. Clinicas:
   - Nombre comercial.
   - Slug.
   - Ciudad.
   - Direccion completa.
   - Telefono y email.
   - Descripcion premium.
   - Imagen principal.
   - Estado verificado.

2. Especialistas con clinica:
   - Nombre.
   - Clinica vinculada.
   - Especialidad.
   - Bio.
   - Foto profesional.
   - Tratamientos que ofrece.
   - Precio y duracion por tratamiento.
   - Agenda semanal.

3. Especialistas independientes:
   - Nombre.
   - Direccion de atencion propia.
   - Ciudad.
   - Especialidad.
   - Bio.
   - Foto profesional.
   - Tratamientos que ofrece.
   - Precio y duracion por tratamiento.
   - Agenda semanal.

4. Tratamientos:
   - Nombre.
   - Slug.
   - Categoria.
   - Descripcion general.
   - Imagen real o premium.
   - Duracion orientativa.
   - Precio orientativo solo si aplica.
   - Texto SEO.

## Agenda y reservas

1. Horarios por especialista.
2. Descansos dentro del dia.
3. Buffers entre consultas.
4. Limite diario si aplica.
5. Bloqueos puntuales.
6. Vacaciones.
7. Prueba de reserva publica.
8. Prueba de confirmacion por email.
9. Prueba de reprogramacion.
10. Prueba de cancelacion.

## Finanzas

No usar comision global.

Cada regla debe ser personal:

1. Comision por clinica.
2. Comision por especialista de clinica, si se negocia aparte.
3. Comision por especialista independiente.

Si una clinica o especialista no tiene regla en `/admin/finanzas`, no se calcula comision para sus reservas.

## Antes de abrir

1. Confirmar emails transaccionales.
2. Confirmar crons o proveedor externo de tareas programadas.
3. Confirmar Google Calendar por especialista.
4. Revisar paginas legales.
5. Revisar SEO publico.
6. Revisar acceso admin por roles.
7. Revisar panel de cada clinica.
8. Revisar panel de especialista independiente.
9. Revisar que no haya contenido demo.
10. Hacer smoke test final en produccion.
