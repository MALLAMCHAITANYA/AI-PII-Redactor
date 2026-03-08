const levelStyles = {
  total: 'text-slate-100',
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-emerald-400',
}

function RiskCard({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${levelStyles[tone]}`}>{value}</p>
    </div>
  )
}

function RiskSummary({ riskSummary }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-soft backdrop-blur">
      <h2 className="text-2xl font-semibold text-slate-100">Risk Summary</h2>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <RiskCard label="Total PII" value={riskSummary.total} tone="total" />
        <RiskCard label="HIGH" value={riskSummary.high} tone="high" />
        <RiskCard label="MEDIUM" value={riskSummary.medium} tone="medium" />
        <RiskCard label="LOW" value={riskSummary.low} tone="low" />
      </div>
    </section>
  )
}

export default RiskSummary
