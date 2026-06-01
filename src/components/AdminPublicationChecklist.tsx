type ChecklistItem = {
  label: string;
  done: boolean;
  hint?: string;
};

export function getPublicationScore(items: ChecklistItem[]) {
  if (items.length === 0) {
    return 0;
  }

  const done = items.filter((item) => item.done).length;

  return Math.round((done / items.length) * 100);
}

export function getPublicationStatus(score: number) {
  if (score >= 85) {
    return {
      label: "Listo para marketplace",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  if (score >= 60) {
    return {
      label: "Publicable con mejoras",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  return {
    label: "Incompleto",
    className: "bg-red-50 text-red-700 border-red-200",
  };
}

export default function AdminPublicationChecklist({
  title = "Salud de publicacion",
  items,
}: {
  title?: string;
  items: ChecklistItem[];
}) {
  const score = getPublicationScore(items);
  const status = getPublicationStatus(score);

  return (
    <div className="rounded-[28px] border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-neutral-500">
            {title}
          </div>
          <div className="mt-2 text-2xl font-semibold">{score}%</div>
        </div>

        <div className={`rounded-full border px-3 py-2 text-xs ${status.className}`}>
          {status.label}
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-2xl bg-[#F8F6F2] p-3 text-sm"
          >
            <div
              className={`mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                item.done ? "bg-black text-white" : "bg-white text-neutral-400"
              }`}
            >
              {item.done ? "OK" : "!"}
            </div>

            <div>
              <div className="font-medium">{item.label}</div>
              {!item.done && item.hint && (
                <div className="mt-1 text-xs text-neutral-500">{item.hint}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
