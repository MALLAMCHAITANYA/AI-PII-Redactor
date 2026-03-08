import logging
from services.audio_redactor import audio_redactor
from pydub.generators import Sine
import io

# Setup basic logging to see the output in terminal
logging.basicConfig(level=logging.INFO)

def run_debug():
    # 1. Create a dummy audio with a "secret" number
    # Standard Whisper behavior: it might struggle with short audio, but let's try.
    print("Generating test audio...")
    from pydub import AudioSegment
    # "My name is Alex. 1 2 3 4 5 6 7 8 9 0"
    # For now, let's just use a silent file and hope whisper mishears nothing OR use a real sample if we can.
    # Actually, let's just assume we want to test RECTIFICATION. 
    # If we can't record voice here, let's check if we can at least run the engine.
    
    # Let's generate a 5-second silent file and mock the transcription to test THE SYNC logic.
    audio = AudioSegment.silent(duration=5000)
    buffer = io.BytesIO()
    audio.export(buffer, format="wav")
    audio_bytes = buffer.getvalue()
    
    print("Calling redact_audio...")
    # Mocking findings or just running it normally
    try:
        # We need a REAL audio file for Whisper to give us segments.
        # If we dont have one, let's at least see if it fails to LOAD the model.
        result = audio_redactor.redact_audio(audio_bytes)
        print(f"Redaction result keys: {result.keys()}")
        print(f"Findings: {result['findings']}")
        print(f"Transcript: {result['text']}")
    except Exception as e:
        print(f"Redaction Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_debug()
