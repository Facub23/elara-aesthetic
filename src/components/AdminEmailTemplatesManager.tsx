"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { showAdminToast } from "@/components/AdminToast";
import {
  renderEmailTemplateText,
  type EmailTemplate,
} from "@/lib/email-templates";

const variables = [
  "{{nombre}}",
  "{{email}}",
  "{{telefono}}",
  "{{telefono_label}}",
  "{{tratamiento}}",
  "{{clinica}}",
  "{{especialista}}",
  "{{fecha_label}}",
  "{{estado}}",
  "{{cambio_anterior}}",
];

const demoVariables = {
  nombre: "Paciente Demo",
  email: "paciente.demo@example.com",
  telefono: "+34 600 111 222",
  telefono_label: " - Telefono: +34 600 111 222",
  tratamiento: "Botox",
  clinica: "Clinica Demo Madrid",
  especialista: "Dra. Valentina Ruiz",
  fecha_label: " el 25/06/2026 a las 10:30",
  estado: "Confirmada",
  cambio_anterior: " Antes figuraba para 24/06/2026 a las 09:00.",
};

export default function AdminEmailTemplatesManager({
  initialTemplates,
  defaultTemplates,
}: {
  initialTemplates: EmailTemplate[];
  defaultTemplates: EmailTemplate[];
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [activeKey, setActiveKey] = useState(initialTemplates[0]?.key);
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const activeTemplate = useMemo(
    () => templates.find((template) => template.key === activeKey),
    [activeKey, templates]
  );

  const preview = useMemo(() => {
    if (!activeTemplate) return null;

    return {
      subject: renderEmailTemplateText(
        activeTemplate.subject,
        demoVariables
      ),
      title: renderEmailTemplateText(activeTemplate.title, demoVariables),
      message: renderEmailTemplateText(activeTemplate.body, demoVariables),
      ctaLabel: activeTemplate.cta_label
        ? renderEmailTemplateText(activeTemplate.cta_label, demoVariables)
        : "",
    };
  }, [activeTemplate]);

  function updateTemplate(
    key: string,
    values: Partial<EmailTemplate>
  ) {
    setTemplates((prev) =>
      prev.map((template) =>
        template.key === key
          ? {
              ...template,
              ...values,
            }
          : template
      )
    );
  }

  async function saveTemplates(nextTemplates = templates, reset = false) {
    setLoading(true);

    const res = await fetch("/api/update-email-templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templates: nextTemplates,
        reset,
      }),
    });

    const data = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok) {
      showAdminToast(data.error || "Error guardando plantillas", "error");
      return;
    }

    showAdminToast(
      reset ? "Plantillas restauradas" : "Plantillas guardadas",
      "success"
    );
    router.refresh();
  }

  async function restoreDefaults() {
    setTemplates(defaultTemplates);
    setActiveKey(defaultTemplates[0]?.key);
    await saveTemplates(defaultTemplates, true);
  }

  async function sendTestEmail() {
    if (!activeTemplate) return;

    setTestLoading(true);

    const res = await fetch("/api/send-test-email-template", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: activeTemplate,
        to: testEmail || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));

    setTestLoading(false);

    if (!res.ok || !data.success) {
      showAdminToast(data.error || "No se pudo enviar la prueba", "error");
      return;
    }

    showAdminToast(`Email de prueba enviado a ${data.to}`, "success");
  }

  if (!activeTemplate) return null;

  return (
    <div className="mt-12 grid gap-8 xl:grid-cols-[360px_1fr]">
      <aside className="space-y-3">
        {templates.map((template) => {
          const active = template.key === activeTemplate.key;

          return (
            <button
              key={template.key}
              type="button"
              onClick={() => setActiveKey(template.key)}
              className={`w-full rounded-[28px] border p-5 text-left transition ${
                active
                  ? "border-black bg-black text-white"
                  : "border-black/5 bg-white/70 hover:border-black/20"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">
                    {template.name}
                  </div>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      active ? "text-white/60" : "text-neutral-500"
                    }`}
                  >
                    {template.description}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                    template.active
                      ? active
                        ? "bg-white text-black"
                        : "bg-emerald-100 text-emerald-700"
                      : active
                        ? "bg-white/10 text-white/70"
                        : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {template.active ? "Activo" : "Pausado"}
                </span>
              </div>
            </button>
          );
        })}
      </aside>

      <section className="rounded-[40px] border border-white/40 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Plantilla activa
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {activeTemplate.name}
            </h2>
            <p className="mt-3 max-w-2xl text-neutral-500">
              {activeTemplate.description}
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-full bg-[#F7F5F2] px-5 py-3 text-sm">
            <input
              type="checkbox"
              checked={activeTemplate.active}
              onChange={(event) =>
                updateTemplate(activeTemplate.key, {
                  active: event.target.checked,
                })
              }
            />
            Enviar este email
          </label>
        </div>

        <div className="mt-8 grid gap-5">
          <div>
            <label className="text-sm text-neutral-500">Asunto</label>
            <input
              value={activeTemplate.subject}
              onChange={(event) =>
                updateTemplate(activeTemplate.key, {
                  subject: event.target.value,
                })
              }
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-white px-5 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-500">
              Titulo del email
            </label>
            <input
              value={activeTemplate.title}
              onChange={(event) =>
                updateTemplate(activeTemplate.key, {
                  title: event.target.value,
                })
              }
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-white px-5 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-500">Contenido</label>
            <textarea
              rows={10}
              value={activeTemplate.body}
              onChange={(event) =>
                updateTemplate(activeTemplate.key, {
                  body: event.target.value,
                })
              }
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white p-5 leading-relaxed outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-500">
              Texto del boton opcional
            </label>
            <input
              value={activeTemplate.cta_label || ""}
              onChange={(event) =>
                updateTemplate(activeTemplate.key, {
                  cta_label: event.target.value,
                })
              }
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-white px-5 outline-none"
            />
          </div>
        </div>

        {preview ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[28px] bg-[#F7F5F2] p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Vista previa
              </p>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-black/10 bg-white">
                <div className="bg-black p-6 text-white">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-white/50">
                    EncuentraTuClinica
                  </div>

                  <h3 className="mt-4 text-3xl font-semibold tracking-tight">
                    {preview.title}
                  </h3>
                </div>

                <div className="p-6">
                  <p className="whitespace-pre-line text-sm leading-7 text-neutral-600">
                    {preview.message}
                  </p>

                  {preview.ctaLabel ? (
                    <div className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm text-white">
                      {preview.ctaLabel}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-neutral-500">
                <span className="font-semibold text-black">Asunto:</span>{" "}
                {preview.subject}
              </div>
            </div>

            <div className="rounded-[28px] bg-black p-6 text-white">
              <p className="text-sm uppercase tracking-[0.25em] text-white/50">
                Prueba real
              </p>

              <h3 className="mt-4 text-2xl font-semibold">
                Enviar email de prueba
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-white/60">
                Si dejas el campo vacio, se envia al email del admin actual.
              </p>

              <input
                type="email"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                placeholder="correo@dominio.com"
                className="mt-6 h-12 w-full rounded-full border border-white/10 bg-white/10 px-5 text-sm text-white outline-none placeholder:text-white/35"
              />

              <button
                type="button"
                disabled={testLoading}
                onClick={sendTestEmail}
                className="mt-4 h-12 w-full rounded-full bg-white text-sm font-semibold text-black disabled:opacity-50"
              >
                {testLoading ? "Enviando..." : "Enviar prueba"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-8 rounded-[28px] bg-[#F7F5F2] p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Variables disponibles
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {variables.map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() =>
                  navigator.clipboard?.writeText(variable).catch(() => null)
                }
                className="rounded-full bg-white px-4 py-2 text-sm text-neutral-700"
              >
                {variable}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => saveTemplates()}
            className="rounded-full bg-black px-6 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={restoreDefaults}
            className="rounded-full border border-black/10 bg-white px-6 py-3 disabled:opacity-50"
          >
            Restaurar originales
          </button>
        </div>
      </section>
    </div>
  );
}
