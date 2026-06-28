import type { HedonicModel } from "@/lib/valuation";

/** Round to the nearest $100 and prefix an explicit + / − sign. */
function signed(amount: number): string {
  const rounded = Math.round(amount / 100) * 100;
  const sign = rounded >= 0 ? "+" : "−";
  return `${sign}$${Math.abs(rounded).toLocaleString()}`;
}

export default function HedonicBreakdown({ model }: { model: HedonicModel }) {
  const terms = [...model.terms].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const hasHeuristic = terms.some((t) => t.heuristic);

  return (
    <div className="space-y-3">
      {terms.map((t) => (
        <div key={t.key} className="flex items-baseline justify-between border-b border-card-border pb-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm text-foreground">{t.label}</span>
            <span className="text-xs text-subtle">{t.unit}</span>
            {t.heuristic && (
              <span className="text-[10px] uppercase tracking-[0.1em] text-subtle border border-card-border px-1 py-px">
                ≈ text-detected
              </span>
            )}
          </div>
          <span className={`text-sm font-medium whitespace-nowrap ${t.amount >= 0 ? "text-trend-up" : "text-trend-down"}`}>
            {signed(t.amount)}
          </span>
        </div>
      ))}
      <p className="text-xs text-subtle pt-1">
        Model fit R² {model.r2.toFixed(2)} · {model.n} sales with mileage &amp; model year
        {hasHeuristic ? " · ≈ modified / import are inferred from listing text, so treat those as directional" : ""}
      </p>
    </div>
  );
}
