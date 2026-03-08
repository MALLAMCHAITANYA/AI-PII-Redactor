import os
import tempfile
from services.text_redactor import text_redactor
import logging
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Robust FFmpeg discovery
ffmpeg_found = False
possible_ffmpeg_paths = [
    r"C:\ffmpeg\bin",
    r"C:\Program Files\ffmpeg\bin",

    r"C:\ffmpeg"
]

for p in possible_ffmpeg_paths:
    if os.path.exists(p):
        if p not in os.environ["PATH"]:
            os.environ["PATH"] += os.pathsep + p
        ffmpeg_found = True
        logger.info(f"Found FFmpeg at: {p}")
        break

if not ffmpeg_found:
    import shutil
    if shutil.which("ffmpeg"):
        logger.info("FFmpeg already in system PATH")
    else:
        logger.warning("FFmpeg NOT FOUND in common paths or system PATH. Audio redaction will likely fail.")


class AudioRedactorService:
    def __init__(self):
        self.model = None
        self._is_loading = False
        logger.info("AudioRedactorService initialized (Lazy loading enabled)")

    def _ensure_model(self):
        if self.model is None:
            if self._is_loading:
                raise RuntimeError("Whisper model is currently loading. Please try again in a moment.")
            
            try:
                self._is_loading = True
                logger.info("Loading Whisper 'tiny' model and internal dependencies...")
                
                # Lazy load internal dependencies
                import whisper
                from pydub import AudioSegment
                from pydub.generators import Sine
                
                # Store them on the instance if needed or just use them locally in redact_audio
                self.AudioSegment = AudioSegment
                self.Sine = Sine
                
                self.model = whisper.load_model("tiny")
                logger.info("Whisper 'tiny' model and dependencies loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load audio dependencies: {e}")
                raise RuntimeError(f"Could not load audio dependencies: {e}. Please ensure 'openai-whisper' and 'pydub' are installed.")
            finally:
                self._is_loading = False

    def redact_audio(self, audio_bytes: bytes, entities: list = None) -> dict:
        self._ensure_model()
        # Rest of the method...

        # 1. Save bytes to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_input:
            temp_input.write(audio_bytes)
            temp_input_path = temp_input.name

        try:
            # 2. Transcribe with timestamps
            logger.info("Starting transcription with Whisper...")
            result = self.model.transcribe(temp_input_path, word_timestamps=True)
            full_text = result['text']
            logger.info(f"Transcription complete. Text: {full_text}")
            
            # 3. Analyze text for PII
            logger.info(f"Analyzing transcript for PII: {full_text}")
            redaction_result = text_redactor.redact_text(full_text, entities=entities)
            findings = redaction_result.get('findings', [])
            risk_summary = redaction_result.get('risk_summary', {"total": 0, "high": 0, "medium": 0, "low": 0})
            
            logger.info(f"PII Findings: {findings}")

            # 4. Filter findings and map to timestamps
            pii_intervals = []
            
            all_words = []
            for segment in result['segments']:
                if 'words' in segment:
                    all_words.extend(segment['words'])
            
            for segment in result['segments']:
                seg_text = segment['text']
                seg_start = segment['start']
                seg_end = segment['end']
                
                if 'words' in segment:
                    for word_obj in segment['words']:
                        # Remove common punctuation from word for better matching
                        word_text = word_obj['word'].strip().lower().strip('.,?!:;')
                        w_start = word_obj['start']
                        w_end = word_obj['end']
                        
                        for finding in findings:
                            finding_text = finding['detected_text'].strip().lower()
                            # Robust check: if word is part of finding or vice versa
                            if word_text and (word_text in finding_text or finding_text in word_text or any(w in word_text for w in finding_text.split())):
                                pii_intervals.append((w_start, w_end))
                                logger.info(f"MATCHED: word '{word_text}' ({w_start}-{w_end}) to PII '{finding_text}'")
                                break
                else:
                    logger.warning(f"No word-level timestamps in segment: '{seg_text}'")
                    for finding in findings:
                        if finding['detected_text'].strip().lower() in seg_text.lower():
                            pii_intervals.append((seg_start, seg_end))
                            logger.info(f"MATCHED: segment '{seg_text}' ({seg_start}-{seg_end}) to PII '{finding['detected_text']}'")
                            break

            # 5. Load audio for manipulation
            audio = self.AudioSegment.from_file(temp_input_path)
            
            # 6. Apply beeps
            pii_intervals.sort()
            merged_intervals = []
            if pii_intervals:
                curr_start, curr_end = pii_intervals[0]
                for next_start, next_end in pii_intervals[1:]:
                    if next_start <= curr_end:
                        curr_end = max(curr_end, next_end)
                    else:
                        merged_intervals.append((curr_start, curr_end))
                        curr_start, curr_end = next_start, next_end
                merged_intervals.append((curr_start, curr_end))

            logger.info(f"Applying beeps at intervals: {merged_intervals}")
            for start_sec, end_sec in merged_intervals:
                start_ms = int(start_sec * 1000)
                end_ms = int(end_sec * 1000)
                
                duration = end_ms - start_ms
                if duration <= 0: continue
                
                # Use a moderate beep (+2 gain) to be clear but not uncomfortable
                beep = self.Sine(1000).to_audio_segment(duration=duration).apply_gain(2) 
                audio = audio[:start_ms] + beep + audio[end_ms:]

            # 7. Export to bytes
            output_buffer = io.BytesIO()
            audio.export(output_buffer, format="mp3")
            
            return {
                "audio_bytes": output_buffer.getvalue(),
                "findings": findings,
                "risk_summary": risk_summary,
                "text": full_text
            }

        finally:
            if os.path.exists(temp_input_path):
                os.remove(temp_input_path)

# Instantiate singleton
audio_redactor = AudioRedactorService()
