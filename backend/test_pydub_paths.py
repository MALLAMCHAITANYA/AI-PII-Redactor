import os
from pydub import AudioSegment
from pydub.utils import get_prober_name, get_player_name

print(f"Prober: {get_prober_name()}")
print(f"Player: {get_player_name()}")

# Check if it's in the OS path
import shutil
print(f"ffmpeg in path: {shutil.whoami('ffmpeg') if hasattr(shutil, 'whoami') else shutil.which('ffmpeg')}")
print(f"ffprobe in path: {shutil.which('ffprobe')}")
