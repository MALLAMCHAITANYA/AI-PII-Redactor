from services.audio_redactor import audio_redactor
import os

def test_audio_redaction_logic():
    # This test assumes you have a small audio file named 'test.wav' 
    # for testing purposes. If not, it will skip.
    test_file = "sample_audio.wav"
    
    if not os.path.exists(test_file):
        print(f"Skipping test: {test_file} not found.")
        print("To verify, please record yourself saying 'My name is Alex' and save as sample_audio.wav")
        return

    print(f"Testing audio redaction on {test_file}...")
    with open(test_file, "rb") as f:
        audio_bytes = f.read()
    
    try:
        redacted_audio = audio_redactor.redact_audio(audio_bytes)
        with open("redacted_sample.mp3", "wb") as f:
            f.write(redacted_audio)
        print("Redaction complete. Result saved to redacted_sample.mp3")
    except Exception as e:
        print(f"Redaction failed: {e}")

if __name__ == "__main__":
    test_audio_redaction_logic()
