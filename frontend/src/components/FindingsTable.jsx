function FindingsTable({ findings }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-soft backdrop-blur">
      <h2 className="text-2xl font-semibold text-slate-100">Detected PII</h2>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-300">
              <th className="px-3 py-2 font-medium">detected_text</th>
              <th className="px-3 py-2 font-medium">pii_type</th>
              <th className="px-3 py-2 font-medium">risk_level</th>
              <th className="px-3 py-2 font-medium">source</th>
            </tr>
          </thead>

          <tbody>
            {findings.length > 0 ? (
              findings.map((item, index) => (
                <tr
                  key={`${item.detected_text}-${index}`}
                  className={index % 2 === 0 ? 'bg-slate-950/60' : 'bg-slate-900/40'}
                >
                  <td className="px-3 py-2 text-slate-100">{item.detected_text || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{item.pii_type || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{item.risk_level || '-'}</td>
                  <td className="px-3 py-2 text-slate-200">{item.source || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                  No PII findings yet. Submit text for analysis.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default FindingsTable
