# 🛡️ AI PII Redactor

An intelligent, secure, and modern privacy tool designed to automatically redact **Personally Identifiable Information (PII)** from text, images, and audio files. Powered by **FastAPI** on the backend and a premium **React + Vite + Tailwind CSS** dashboard on the frontend.

<div align="center">
  <img src="frontend/public/favicon.svg" width="120" height="120" alt="AI PII Redactor Logo" />
  <p><em>Protecting privacy, one file at a time.</em></p>
</div>

---

## 🌐 Live Deployments
- 🎨 **Frontend Web App**: [https://ai-pii-redactor-1.vercel.app](https://ai-pii-redactor-1.vercel.app)
- ⚙️ **Backend API Server**: [https://ai-pii-redactor-1.onrender.com](https://ai-pii-redactor-1.onrender.com)

---

## ✨ Features
- 📝 **Text Redaction**: Instantly scan and sanitize raw text using Microsoft Presidio.
- 🖼️ **Image Redaction**: Automatically detect and black out text-based PII inside images using Tesseract OCR.
- 🔊 **Audio Redaction**: Detect and mask spoken PII inside audio files with smart beep overlay.
- 📋 **Detected PII Log**: Detailed breakdown of detected PII entities, risk levels, and categories.
- ⚙️ **Entity Selection**: Customize which details (e.g. Aadhaar Card, PAN, Email, SSN, API Keys) you want to target.

---

## 📂 Project Structure

- **[`frontend/`](file:///c:/Projects/AI%20PII%20Redactor/frontend)**: React + Vite web dashboard styled with Tailwind CSS.
- **[`backend/`](file:///c:/Projects/AI%20PII%20Redactor/backend)**: Python FastAPI server handling presidio analyzer, OCR, and audio masking.

---

## 🚀 Quick Start Guide

Follow these simple steps to spin up the entire application locally.

### 1. Run the Backend (FastAPI)
Open a terminal in the project root directory and execute:

```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Download the spaCy model
python -m spacy download en_core_web_lg

# Run the API server
python main.py
```
*The backend API will run at `http://127.0.0.1:8000/`.*

---

### 2. Run the Frontend (React + Vite)
Open a **new** terminal window in the project root directory and execute:

```bash
# Navigate to the frontend folder
cd frontend

# Install Node modules
npm install

# Start the local development server
npm run dev
```
*The frontend dashboard will run at `http://localhost:5173/`.*

---

## 📖 Deep Dives
For more details, advanced setups, and environmental requirements (e.g., FFmpeg and Tesseract binaries), check the individual readmes:
- 🐍 [Backend Setup & Endpoints](file:///c:/Projects/AI%20PII%20Redactor/backend/README.md)
- ⚛️ [Frontend UI Configuration](file:///c:/Projects/AI%20PII%20Redactor/frontend/README.md)

---

## 🔒 Security First
This redactor executes PII scans using local models (Presidio/SpaCy) and open-source OCR and transcription libraries, ensuring your private data remains securely under your control.
