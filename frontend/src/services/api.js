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
      responseType: 'blob', // Expect a raw image back
    })

    // Extract findings and risk summary from custom headers
    const findingsHeader = response.headers['x-pii-findings']
    const riskSummaryHeader = response.headers['x-pii-risk-summary']
    
    let findings = []
    let riskSummary = { total: 0, high: 0, medium: 0, low: 0 }
    
    try {
      if (findingsHeader) findings = JSON.parse(findingsHeader)
      if (riskSummaryHeader) riskSummary = JSON.parse(riskSummaryHeader)
    } catch (e) {
      console.error('Failed to parse findings from headers', e)
    }

    // Create a local object URL from the Blob response
    const redactedImageUrl = URL.createObjectURL(response.data)

    return {
      redacted_text: redactedImageUrl, // We will use this to display the image
      highlighted_html: '',
      findings: findings,
      risk_summary: riskSummary,
    }
  } catch (error) {
    throw error
  }
}
