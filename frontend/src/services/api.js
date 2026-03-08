import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 20000,
})

function normalizeResponse(payload) {
  return {
    redacted_text: payload?.redacted_text || payload?.output_text || payload?.redacted || payload?.text || '',
    highlighted_html: payload?.highlighted_html || payload?.highlightedText || '',
    findings: Array.isArray(payload?.findings) ? payload.findings : [],
    risk_summary: payload?.risk_summary || { total: 0, high: 0, medium: 0, low: 0 },
  }
}

export async function checkHealth() {
  const response = await apiClient.get('/health')
  return response.data
}

export async function redactText(text, entities = null) {
  const response = await apiClient.post('/redact/text', { text, entities })
  return normalizeResponse(response.data)
}

export async function redactFile(file, entities = null) {
  const formData = new FormData()
  formData.append('file', file)
  if (entities) {
    formData.append('entities', JSON.stringify(entities))
  }

  const response = await apiClient.post('/redact/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return normalizeResponse(response.data)
}

export async function redactAudio(audioFile, entities = null) {
  const formData = new FormData()
  formData.append('file', audioFile)
  if (entities) {
    formData.append('entities', JSON.stringify(entities))
  }

  const response = await apiClient.post('/redact/audio', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  // Normalize response will handle findings and risk_summary correctly if we pass the whole data
  const normalized = normalizeResponse(response.data)
  
  // Override redacted_text to use the base64 audio URL
  return {
    ...normalized,
    redacted_text: response.data.redacted_audio_base64,
  }
}

export async function redactImage(imageFile, entities = null) {
  const formData = new FormData()
  formData.append('file', imageFile)
  if (entities) {
    formData.append('entities', JSON.stringify(entities))
  }

  try {
    const response = await apiClient.post('/redact/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob', // Important: we expect a raw image back
    })

    // Create a local object URL from the Blob response
    const redactedImageUrl = URL.createObjectURL(response.data)

    return {
      redacted_text: redactedImageUrl, // We will use this to display the image
      highlighted_html: '',
      findings: [],
      risk_summary: { total: 0, high: 0, medium: 0, low: 0 },
    }
  } catch (error) {
    // Attempt to read the error message if the backend returned JSON instead of an image
    if (error.response && error.response.data instanceof Blob && error.response.data.type === 'application/json') {
      const text = await error.response.data.text()
      try {
        const json = JSON.parse(text)
        error.response.data = json // re-assign so the dashboard error handler catches it
      } catch (e) {
        // ignore
      }
    }
    throw error
  }
}
