from pydantic import BaseModel
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from services.text_redactor import text_redactor
from services.image_redactor import image_redactor
from services.audio_redactor import audio_redactor

# Initialize FastAPI app
app = FastAPI(
    title="AI PII Redactor API",
    description="API for redacting PII from text and images using Microsoft Presidio and Tesseract OCR.",
    version="1.0.0"
)

# Allow CORS from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allow all. In production, restrict to frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI PII Redactor Backend is running!"}

# Pydantic model for incoming text requests
class TextRequest(BaseModel):
    text: str
    entities: list[str] = None

@app.post("/api/redact/text")
def redact_text_endpoint(request: TextRequest):
    try:
        # Now returns a dict with redacted_text, findings, etc.
        result = text_redactor.redact_text(request.text, entities=request.entities)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/redact/file")
async def redact_file_endpoint(file: UploadFile = File(...), entities: str = Form(None)):
    if not file.filename.endswith(('.txt', '.md', '.csv', '.json')):
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a text-based file.")
        
    try:
        parsed_entities = None
        if entities:
            import json
            try:
                parsed_entities = json.loads(entities)
            except json.JSONDecodeError:
                pass 
                
        content_bytes = await file.read()
        # Attempt to decode as UTF-8
        try:
            content = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            # Fallback to latin-1 if utf-8 fails
            content = content_bytes.decode("latin-1")
            
        result = text_redactor.redact_text(content, entities=parsed_entities)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/redact/audio")
async def redact_audio_endpoint(file: UploadFile = File(...), entities: str = Form(None)):
    if not file.content_type.startswith("audio/"):
        if not file.filename.endswith(('.mp3', '.wav', '.webm', '.m4a', '.ogg')):
            raise HTTPException(status_code=400, detail="Uploaded file is not an audio file.")
        
    try:
        parsed_entities = None
        if entities:
            import json
            try:
                parsed_entities = json.loads(entities)
            except json.JSONDecodeError:
                pass
                
        contents = await file.read()
        # redact_audio now returns a dict with audio_bytes, findings, and risk_summary
        result = audio_redactor.redact_audio(contents, entities=parsed_entities)
        
        # We'll encode the audio as base64 so we can send it in JSON along with findings
        import base64
        encoded_audio = base64.b64encode(result["audio_bytes"]).decode("utf-8")
        
        return {
            "redacted_audio_base64": f"data:audio/mpeg;base64,{encoded_audio}",
            "findings": result["findings"],
            "risk_summary": result["risk_summary"],
            "text": result.get("text", "") # transcribed text
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Audio redaction failed: {str(e)}")


@app.post("/api/redact/image")
async def redact_image_endpoint(file: UploadFile = File(...), entities: str = Form(None)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not an image.")
        
    try:
        # Pydantic form data comes in as a string, so we need to parse it if it exists
        parsed_entities = None
        if entities:
            import json
            try:
                parsed_entities = json.loads(entities)
            except json.JSONDecodeError:
                pass # Fallback to None if not valid JSON
                
        contents = await file.read()
        redacted_bytes = image_redactor.redact_image(contents, entities=parsed_entities)
        
        # Return the raw image bytes back to the frontend with correct content type
        return Response(content=redacted_bytes, media_type="image/jpeg")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
