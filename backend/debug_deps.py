try:
    import whisper
    print("Whisper imported.")
except Exception as e:
    print(f"Whisper import failed: {e}")

try:
    from pydub import AudioSegment
    print("Pydub imported.")
    # Simple check for ffmpeg
    from pydub.utils import get_prober_name
    print(f"Pydub prober: {get_prober_name()}")
except Exception as e:
    print(f"Pydub import failed: {e}")

try:
    model = whisper.load_model("tiny")
    print("Tiny model loaded.")
except Exception as e:
    print(f"Whisper model load failed: {e}")
