import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import FindingsTable from '../components/FindingsTable'
import RedactedOutput from '../components/RedactedOutput'
import RiskSummary from '../components/RiskSummary'
import Sidebar from '../components/Sidebar'
import TextInput from '../components/TextInput'
import { redactAudio, redactFile, redactImage, redactText } from '../services/api'

const SAMPLE_TEXT =
  'My name is Alex. My Aadhaar is 1234 5678 9012 and my PAN is ABCDE1234F. Reach me at +91 98765 43210 or alex.demo@gmail.com. My employee ID is EMP-8821 and my API key is sk-1234567890abcdef1234567890abcdef.'

const INITIAL_RISK_SUMMARY = {
  total: 0,
  high: 0,
  medium: 0,
  low: 0,
}

function Dashboard() {
  // Input controls and sidebar options.
  const [inputText, setInputText] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [inputMode, setInputMode] = useState('text')
  const [selectedEntities, setSelectedEntities] = useState([
    'PERSON',
    'EMAIL_ADDRESS',
    'PHONE_NUMBER',
    'LOCATION',
    'US_SSN',
    'CREDIT_CARD',
    'EMPLOYEE_ID',
    'IN_AADHAAR',
    'IN_PAN',
    'IN_PHONE',
    'API_KEY'
  ])

  // API-driven result state.
  const [redactedText, setRedactedText] = useState('')
  const [highlightedHtml, setHighlightedHtml] = useState('')
  const [findings, setFindings] = useState([])
  const [riskSummary, setRiskSummary] = useState(INITIAL_RISK_SUMMARY)
  const [showOutput, setShowOutput] = useState(false)

  // Request lifecycle state.
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isInputEmpty = useMemo(() => inputText.trim().length === 0, [inputText])

  // Normalize API payload and map to dashboard sections.
  const updateFromResponse = (data) => {
    setRedactedText(data?.redacted_text || '')
    setHighlightedHtml(data?.highlighted_html || '')
    setFindings(Array.isArray(data?.findings) ? data.findings : [])
    setRiskSummary(data?.risk_summary || INITIAL_RISK_SUMMARY)
  }

  const submitRedaction = async () => {
    setShowOutput(true)

    if (inputMode === 'text' && isInputEmpty) {
      setErrorMessage('Please enter text before redacting.')
      toast.error('Input text is required.')
      return
    }

    if (inputMode === 'image' && !uploadFile) {
      setErrorMessage('Please upload an image before processing.')
      toast.error('Image file is required.')
      return
    }

    if (inputMode === 'text-file' && !uploadFile) {
      setErrorMessage('Please upload a text file before processing.')
      toast.error('Text file is required.')
      return
    }

    if (inputMode === 'audio' && !uploadFile) {
      setErrorMessage('Please upload or record an audio file before processing.')
      toast.error('Audio file is required.')
      return
    }

    if (inputMode === 'video') {
      toast('Backend endpoint for this mode is not connected yet.', {
        icon: '🧩',
      })
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      let data
      if (inputMode === 'image') {
        data = await redactImage(uploadFile, selectedEntities)
      } else if (inputMode === 'audio') {
        data = await redactAudio(uploadFile, selectedEntities)
      } else if (inputMode === 'text-file') {
        data = await redactFile(uploadFile, selectedEntities)
      } else {
        data = await redactText(inputText, selectedEntities)
      }
      updateFromResponse(data)
      toast.success('Output generated successfully.')
    } catch (error) {
      const apiError = error?.response?.data?.detail || error?.response?.data?.message || 'Redaction failed. Please try again.'
      setErrorMessage(apiError)
      toast.error(apiError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleValidate = () => {
    if (inputMode === 'image') {
      if (!uploadFile) {
        setErrorMessage('Please upload an image before validating.')
        toast.error('Image file is required.')
        return
      }

      setErrorMessage('')
      toast.success('Image looks ready for redaction.')
      return
    }

    if (inputMode === 'text-file') {
      if (!uploadFile) {
        setErrorMessage('Please upload a file before validating.')
        toast.error('File is required.')
        return
      }
      setErrorMessage('')
      toast.success('File looks ready for redaction.')
      return
    }

    if (inputMode === 'audio') {
      if (!uploadFile) {
        setErrorMessage('Please upload or record audio before validating.')
        toast.error('Audio is required.')
        return
      }
      setErrorMessage('')
      toast.success('Audio looks ready for redaction.')
      return
    }

    if (inputMode === 'video') {
      setErrorMessage('Validation for this mode will be enabled when backend endpoint is available.')
      toast('This mode is frontend-only right now.', { icon: 'ℹ️' })
      return
    }

    if (isInputEmpty) {
      setErrorMessage('Please enter text before validating.')
      toast.error('Nothing to validate.')
      return
    }

    setErrorMessage('')
    toast.success('Text looks ready for redaction.')
  }

  const handleLoadSample = () => {
    setInputMode('text')
    setUploadFile(null)
    setInputText(SAMPLE_TEXT)
    setErrorMessage('')
    toast.success('Sample text loaded.')
  }

  const handleDownload = () => {
    if (!redactedText) {
      toast.error('No output available to download.')
      return
    }

    const blob = new Blob([redactedText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    
    const filename = inputMode === 'text-file' && uploadFile ? `redacted_${uploadFile.name}` : 'output.txt'
    anchor.download = filename

    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    if (!redactedText) {
      toast.error('No output available to copy.')
      return
    }

    try {
      await navigator.clipboard.writeText(redactedText)
      toast.success('Output copied.')
    } catch {
      toast.error('Clipboard copy failed.')
    }
  }

  const handleToggleEntity = (id) => {
    setSelectedEntities((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 md:px-6">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <Sidebar
          onLoadSample={handleLoadSample}
          isLoading={isLoading}
          selectedEntities={selectedEntities}
          onToggleEntity={handleToggleEntity}
        />

        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-slate-100">AI PII Redactor</h1>
            
          </header>

          <TextInput
            text={inputText}
            onTextChange={(event) => setInputText(event.target.value)}
            onValidate={handleValidate}
            onRedact={submitRedaction}
            isLoading={isLoading}
            inputMode={inputMode}
            onModeChange={(mode) => {
              setInputMode(mode)
              setUploadFile(null)
            }}
            onUploadFileChange={setUploadFile}
          />

          {isLoading ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">Processing request...</div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-lg border border-red-700/60 bg-red-950/40 p-3 text-sm text-red-200">{errorMessage}</div>
          ) : null}

          {showOutput ? (
            <RedactedOutput
              outputText={redactedText}
              highlightedHtml={highlightedHtml}
              onDownload={handleDownload}
              onCopy={handleCopy}
              outputMode={inputMode}
            />
          ) : null}

          <FindingsTable findings={findings} />
          <RiskSummary riskSummary={riskSummary} />
        </div>
      </div>
    </main>
  )
}

export default Dashboard
