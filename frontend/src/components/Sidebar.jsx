const PII_ENTITIES = [
  { id: 'PERSON', label: 'Names' },
  { id: 'EMAIL_ADDRESS', label: 'Emails' },
  { id: 'PHONE_NUMBER', label: 'Phone Numbers' },
  { id: 'LOCATION', label: 'Locations' },
  { id: 'US_SSN', label: 'SSN (US)' },
  { id: 'CREDIT_CARD', label: 'Credit Cards' },
  { id: 'EMPLOYEE_ID', label: 'Employee ID (Custom)' },
  { id: 'IN_AADHAAR', label: 'Aadhaar (India)' },
  { id: 'IN_PAN', label: 'PAN Card (India)' },
  { id: 'IN_PHONE', label: 'Indian Phone' },
  { id: 'API_KEY', label: 'API Key' },
]

function Sidebar({ 
  detectLocations, 
  autoValidate, 
  onToggleDetectLocations, 
  onToggleAutoValidate, 
  onLoadSample, 
  isLoading,
  selectedEntities,
  onToggleEntity
}) {
  return (
    <aside className="h-fit rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-soft backdrop-blur">
      <div className="mt-0">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Entities to Redact</h2>
        <div className="space-y-2">
          {PII_ENTITIES.map((entity) => (
            <label key={entity.id} className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-red-500 focus:ring-red-500"
                checked={selectedEntities.includes(entity.id)}
                onChange={() => onToggleEntity(entity.id)}
              />
              {entity.label}
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onLoadSample}
        disabled={isLoading}
        className="mt-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Load sample text
      </button>
    </aside>
  )
}

export default Sidebar
