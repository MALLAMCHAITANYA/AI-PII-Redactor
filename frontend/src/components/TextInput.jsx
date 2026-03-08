import { useEffect, useRef, useState } from 'react'

const INPUT_MODES = [
  { id: 'text', label: 'Text' },
  { id: 'image', label: 'Image' },
  { id: 'text-file', label: 'Text File' },
  { id: 'audio', label: 'Audio' },
  { id: 'video', label: 'Video' },
]

function TextInput({
  text,
  onTextChange,
  onValidate,
  onRedact,
  isLoading,
  inputMode,
  onModeChange,
  onUploadFileChange,
}) {
  const [selectedUpload, setSelectedUpload] = useState('')
  const [liveOn, setLiveOn] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [capturedImage, setCapturedImage] = useState('')
  const [capturedMediaUrl, setCapturedMediaUrl] = useState('')
  const [textFilePreview, setTextFilePreview] = useState('')
  const [cameraError, setCameraError] = useState('')

  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const mediaChunksRef = useRef([])

  const clearCapturedMediaUrl = () => {
    if (capturedMediaUrl) {
      URL.revokeObjectURL(capturedMediaUrl)
      setCapturedMediaUrl('')
    }
  }

  const stopLive = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    if (audioRef.current) {
      audioRef.current.srcObject = null
    }

    setLiveOn(false)
    setIsRecording(false)
  }

  const startLive = async () => {
    setCameraError('')

    if (inputMode === 'text' || inputMode === 'text-file') {
      setCameraError('Live capture is available for image, audio, and video modes.')
      return
    }

    if (!window.isSecureContext) {
      setCameraError('Live capture requires a secure context. Open the app on http://localhost:5173/.')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Media capture is not supported in this browser.')
      return
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasVideoInput = devices.some((device) => device.kind === 'videoinput')
      const hasAudioInput = devices.some((device) => device.kind === 'audioinput')

      if ((inputMode === 'image' || inputMode === 'video') && !hasVideoInput) {
        setCameraError('No camera device was found on this system.')
        return
      }

      if ((inputMode === 'audio' || inputMode === 'video') && !hasAudioInput) {
        setCameraError('No microphone device was found on this system.')
        return
      }

      stopLive()
      clearCapturedMediaUrl()

      const constraintsByMode = {
        image: { video: { facingMode: 'environment' }, audio: false },
        audio: { video: false, audio: true },
        video: { video: { facingMode: 'environment' }, audio: true },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraintsByMode[inputMode])

      streamRef.current = stream

      if ((inputMode === 'image' || inputMode === 'video') && videoRef.current) {
        videoRef.current.srcObject = stream
      }

      if (inputMode === 'audio' && audioRef.current) {
        audioRef.current.srcObject = stream
      }

      setLiveOn(true)
    } catch (error) {
      if (error?.name === 'NotAllowedError') {
        setCameraError('Permission denied. Allow camera/microphone access in browser settings and retry.')
        return
      }

      if (error?.name === 'NotFoundError') {
        setCameraError('Required media device was not detected. Connect device and retry.')
        return
      }

      setCameraError('Unable to access live media. Use localhost and allow permissions, then retry.')
    }
  }

  const captureOrRecord = () => {
    if (!liveOn || !streamRef.current) {
      return
    }

    if (inputMode === 'image') {
      if (!videoRef.current) {
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const context = canvas.getContext('2d')

      if (!context) {
        return
      }

      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      setCapturedImage(canvas.toDataURL('image/png'))
      return
    }

    if (inputMode === 'audio' || inputMode === 'video') {
      if (!window.MediaRecorder) {
        setCameraError('Recording is not supported in this browser.')
        return
      }

      if (isRecording) {
        return
      }

      clearCapturedMediaUrl()
      mediaChunksRef.current = []

      const mimeType = inputMode === 'audio' ? 'audio/webm' : 'video/webm'
      const recorder = new MediaRecorder(streamRef.current, { mimeType })

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: mimeType })
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob)
          setCapturedMediaUrl(url)
          
          // CRITICAL: Pass the recorded blob to the parent Dashboard state
          const file = new File([blob], `recorded_${inputMode}.${mimeType.split('/')[1]}`, { type: mimeType })
          onUploadFileChange?.(file)
        }
        setIsRecording(false)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    }
  }

  useEffect(() => {
    return () => {
      stopLive()
      clearCapturedMediaUrl()
    }
  }, [])

  useEffect(() => {
    setCameraError('')
    setCapturedImage('')
    setTextFilePreview('')
    setSelectedUpload('')
    stopLive()
    clearCapturedMediaUrl()
  }, [inputMode])

  const renderModePanel = () => {
    if (inputMode === 'text') {
      return (
        <>
          <textarea
            id="pii-input"
            value={text}
            onChange={onTextChange}
            placeholder="Enter text to scan and redact..."
            rows={8}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-red-500"
          />

          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Supports long-form text input</span>
            <span>{text.length} characters</span>
          </div>
        </>
      )
    }

    const acceptByMode = {
      image: 'image/*',
      'text-file': '.txt,.md,.csv,.json',
      audio: 'audio/*',
      video: 'video/*',
    }

    const handleUploadChange = async (event) => {
      const file = event.target.files?.[0]
      setSelectedUpload(file?.name || '')
      onUploadFileChange?.(file || null)

      if (!file || inputMode !== 'text-file') {
        return
      }

      try {
        const content = await file.text()
        setTextFilePreview(content.slice(0, 1200))
      } catch {
        setTextFilePreview('Unable to preview this file.')
      }
    }

    return (
      <div className="space-y-3 rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4">
        <p className="text-sm text-slate-300">Upload a {inputMode} input for frontend preview.</p>
        <input
          type="file"
          accept={acceptByMode[inputMode]}
          onChange={handleUploadChange}
          className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-100 hover:file:bg-slate-700"
        />
        {selectedUpload ? <p className="text-xs text-slate-400">Selected: {selectedUpload}</p> : null}

        {inputMode === 'text-file' ? (
          <div className="max-h-36 overflow-auto rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-slate-300">
            {textFilePreview || 'Text file preview will appear here.'}
          </div>
        ) : null}
      </div>
    )
  }

  const liveTitleByMode = {
    image: 'Image (Live)',
    audio: 'Audio (Live)',
    video: 'Video (Live)',
  }

  const liveDescriptionByMode = {
    image: 'Use camera to capture a live image.',
    audio: 'Use microphone to record live audio.',
    video: 'Use camera and microphone to record live video.',
  }

  const showLiveSection = inputMode === 'image' || inputMode === 'audio' || inputMode === 'video'

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-soft backdrop-blur">
      <div className="mb-3">
        <p className="mb-2 block text-sm font-medium text-slate-200">Select input type</p>
        <div className="flex flex-wrap gap-2">
          {INPUT_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onModeChange(mode.id)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium capitalize transition ${
                inputMode === mode.id
                  ? 'border-red-500 bg-red-600/20 text-red-300'
                  : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <label htmlFor="pii-input" className="mb-2 block text-sm font-medium text-slate-200">
        {inputMode === 'text' ? 'Enter text to scan and redact' : `Upload ${inputMode} to continue`}
      </label>

      {renderModePanel()}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onValidate}
          disabled={isLoading}
          className="rounded-md border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Validate Input
        </button>

        <button
          type="button"
          onClick={onRedact}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-800"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Processing...
            </>
          ) : (
            'Get Output'
          )}
        </button>
      </div>

      {showLiveSection ? (
        <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-sm font-medium text-slate-200">{liveTitleByMode[inputMode]}</p>
          <p className="mt-1 text-xs text-slate-400">{liveDescriptionByMode[inputMode]}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startLive}
              disabled={liveOn}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Live
            </button>
            <button
              type="button"
              onClick={captureOrRecord}
              disabled={!liveOn || isRecording}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {inputMode === 'image' ? 'Capture' : isRecording ? 'Recording...' : 'Record'}
            </button>
            <button
              type="button"
              onClick={stopLive}
              disabled={!liveOn && !isRecording}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop Live
            </button>
          </div>

          {inputMode === 'image' || inputMode === 'video' ? (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="overflow-hidden rounded-md border border-slate-800 bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="h-44 w-full object-cover" />
              </div>

              <div className="overflow-hidden rounded-md border border-slate-800 bg-black">
                {inputMode === 'image' ? (
                  capturedImage ? (
                    <img src={capturedImage} alt="Captured frame" className="h-44 w-full object-cover" />
                  ) : (
                    <div className="flex h-44 items-center justify-center text-xs text-slate-500">Captured image preview</div>
                  )
                ) : capturedMediaUrl ? (
                  <video src={capturedMediaUrl} controls className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center text-xs text-slate-500">Recorded video preview</div>
                )}
              </div>
            </div>
          ) : null}

          {inputMode === 'audio' ? (
            <div className="mt-3 space-y-3 rounded-md border border-slate-800 bg-slate-900/50 p-3">
              <audio ref={audioRef} autoPlay muted />
              {capturedMediaUrl ? (
                <audio src={capturedMediaUrl} controls className="w-full" />
              ) : (
                <p className="text-xs text-slate-500">Recorded audio preview</p>
              )}
            </div>
          ) : null}

          {cameraError ? <p className="mt-2 text-xs text-red-300">{cameraError}</p> : null}
        </div>
      ) : null}
    </section>
  )
}

export default TextInput
