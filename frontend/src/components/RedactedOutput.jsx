import DOMPurify from 'dompurify'

function RedactedOutput({ outputText, highlightedHtml, onDownload, onCopy, outputMode }) {
  const safeHtml = DOMPurify.sanitize(highlightedHtml || '')
  const isTextOutput = outputMode === 'text' || outputMode === 'text-file'

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-soft backdrop-blur">
      <h2 className="text-2xl font-semibold text-slate-100">Output</h2>

      {isTextOutput ? (
        <>
          <label htmlFor="safe-output" className="mt-3 block text-sm font-medium text-slate-300">
            Output
          </label>
          <textarea
            id="safe-output"
            readOnly
            value={outputText}
            rows={6}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </>
      ) : (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
          {outputMode === 'image' && outputText ? (
            <div className="flex justify-center">
              <img src={outputText} alt="Redacted Output" className="max-h-96 rounded-md object-contain" />
            </div>
          ) : outputMode === 'audio' && outputText ? (
            <div className="flex justify-center py-4">
              <audio src={outputText} controls className="w-full max-w-md" />
            </div>
          ) : (
            `${outputMode.toUpperCase()} output preview will appear here after backend integration.`
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {isTextOutput && (
          <>
            <button
              type="button"
              onClick={onDownload}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Download output
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Copy to clipboard
            </button>
          </>
        )}
        
        {outputMode === 'image' && outputText && (
          <a
            href={outputText}
            download="redacted_image.jpg"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Download Image
          </a>
        )}
      </div>

      {isTextOutput ? (
        <>
          <h3 className="mt-5 text-sm font-medium text-slate-300">Highlighted Preview</h3>
          <div className="highlighted-preview mt-2 max-h-52 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100">
            {safeHtml ? (
              <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
            ) : (
              <p className="text-slate-500">No highlighted preview available yet.</p>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}

export default RedactedOutput
