import os
import sys

log_file = "diagnostic_log.txt"

def log(message):
    with open(log_file, "a") as f:
        f.write(message + "\n")
    print(message)

if os.path.exists(log_file):
    os.remove(log_file)

log("Starting diagnostic...")
log(f"Current working directory: {os.getcwd()}")
log(f"Python version: {sys.version}")

ffmpeg_path = r"C:\ffmpeg\bin"
log(f"Checking FFmpeg path: {ffmpeg_path}")
log(f"FFmpeg path exists: {os.path.exists(ffmpeg_path)}")
if os.path.exists(ffmpeg_path):
    log(f"Contents of {ffmpeg_path}: {os.listdir(ffmpeg_path)}")

try:
    import whisper
    log("Whisper imported successfully")
except Exception as e:
    log(f"Whisper import failed: {e}")

try:
    from pydub import AudioSegment
    log("Pydub imported successfully")
except Exception as e:
    log(f"Pydub import failed: {e}")

log("Diagnostic complete.")
