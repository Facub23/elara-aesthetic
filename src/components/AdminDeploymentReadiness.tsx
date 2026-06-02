type DeploymentCheck = {
  label: string;
  done: boolean;
  hint: string;
  group?: string;
  href?: string;
  priority?: "critical" | "recommended" | "manual";
};

export default function AdminDeploymentReadiness({
  checks,
}: {
  checks: DeploymentCheck[];
}) {
  const completed = checks.filter((check) => check.done).length;
  const score =
    checks.length > 0 ? Math.round((completed / checks.length) * 100) : 0;
  const criticalMissing = checks.filter(
    (check) => check.priority === "critical" && !check.done
  );
  const groupedChecks = checks.reduce<Record<string, DeploymentCheck[]>>(
    (groups, check) => {
      const group = check.group || "General";
      groups[group] = [...(groups[group] || []), check];

      return groups;
    },
    {}
  );

  return (
    <section className="mt-10 rounded-[40px] border border-black/10 bg-white/70 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Produccion
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Preparacion de despliegue
          </h2>
          <p className="mt-3 max-w-2xl text-neutral-500">
            Comprueba variables, servicios, crons y decisiones pendientes antes
            de abrir la plataforma al publico. No se muestran valores sensibles.
          </p>

          <div
            className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm ${
              criticalMissing.length === 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {criticalMissing.length === 0
              ? "Apto tecnicamente para publicar cuando cargues datos reales"
              : `${criticalMissing.length} bloqueos criticos antes de publicar`}
          </div>
        </div>

        <div className="rounded-3xl bg-black px-6 py-5 text-white">
          <div className="text-sm uppercase tracking-[0.2em] text-white/60">
            Listo
          </div>
          <div className="mt-2 text-4xl font-semibold">{score}%</div>
        </div>
      </div>

      <div className="mt-8 grid gap-5">
        {Object.entries(groupedChecks).map(([group, groupChecks]) => (
          <div
            key={group}
            className="rounded-3xl border border-black/5 bg-white p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  {group}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  {groupChecks.filter((check) => check.done).length}/
                  {groupChecks.length} completados
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {groupChecks.map((check) => {
                const isCritical = check.priority === "critical";
                const isManual = check.priority === "manual";
                const content = (
                  <div
                    className={`h-full rounded-3xl border p-5 transition ${
                      check.done
                        ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                        : isCritical
                          ? "border-red-100 bg-red-50 text-red-800"
                          : isManual
                            ? "border-sky-100 bg-sky-50 text-sky-800"
                            : "border-amber-100 bg-amber-50 text-amber-900"
                    } ${check.href ? "hover:border-black hover:bg-black hover:text-white" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium">{check.label}</div>
                        <div className="mt-2 text-sm opacity-75">{check.hint}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs text-black">
                        {check.done
                          ? "OK"
                          : isCritical
                            ? "Bloquea"
                            : isManual
                              ? "Manual"
                              : "Falta"}
                      </span>
                    </div>
                  </div>
                );

                if (!check.href) {
                  return <div key={check.label}>{content}</div>;
                }

                return (
                  <a key={check.label} href={check.href}>
                    {content}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
