import os
import io
from pydub import AudioSegment
from pydub.generators import Sine

# Replicate the path logic from audio_redactor.py
ffmpeg_path = r"C:\ffmpeg\bin"
if os.path.exists(ffmpeg_path) and ffmpeg_path not in os.environ["PATH"]:
    os.environ["PATH"] += os.pathsep + ffmpeg_path

try:
    print("Checking FFmpeg path...")
    print(f"Path exists: {os.path.exists(ffmpeg_path)}")
    
    print("Generating silent 1s audio...")
    audio = AudioSegment.silent(duration=1000)
    
    print("Generating 500ms beep...")
    beep = Sine(1000).to_audio_segment(duration=500).apply_gain(-10)
    
    print("Applying beep...")
    audio = audio[:250] + beep + audio[750:]
    
    print("Exporting to mp3...")
    buffer = io.BytesIO()
    audio.export(buffer, format="mp3")
    print(f"Export success! Buffer size: {len(buffer.getvalue())}")
    
    with open("debug_beep.mp3", "wb") as f:
        f.write(buffer.getvalue())
    print("Saved to debug_beep.mp3")

except Exception as e:
    print(f"Error during pydub test: {e}")
    import traceback
    traceback.print_exc()
