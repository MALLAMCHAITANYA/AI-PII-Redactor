# AI PII Redactor - Backend

This directory contains the Python-based backend service for the AI PII Redactor. It uses **FastAPI** to provide a REST API for redacting PII from text, images, and audio files.

## 🛠️ Technologies Used
- **FastAPI**: Modern, fast web framework for building APIs.
- **Microsoft Presidio**: Advanced PII detection engine.
- **OpenAI Whisper**: State-of-the-art speech recognition for audio transcription.
- **Pydub**: Audio manipulation (adding beeps).
- **Tesseract OCR**: Optical Character Recognition for image-based PII.

## 🚀 Setup & Execution

### 1. Prerequisites
- **Python 3.10+**
- **FFmpeg**: Required for audio processing. (Install and add to `C:\ffmpeg\bin` or your system PATH).
- **Tesseract OCR**: Required for image redaction.

### 2. Installation
Create and activate a virtual environment, then install the dependencies:
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_lg
```

### 3. Running the Server
```bash
python main.py
```
The backend will start at `http://127.0.0.1:8000`.

## 📡 API Endpoints
- `POST /api/redact/text`: Redact PII from raw text strings.
- `POST /api/redact/file`: Upload and redact text-based files.
- `POST /api/redact/audio`: Upload and redact audio files with beeps.
- `POST /api/redact/image`: Upload and redact image files using OCR.
