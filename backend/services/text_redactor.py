from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_anonymizer import AnonymizerEngine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TextRedactorService:
    def __init__(self):
        logger.info("Initializing Microsoft Presidio Engines...")
        try:
            # The Analyzer Engine identifies PII
            # Try to load models in order of preference
            models = ["en_core_web_sm", "en_core_web_md", "en_core_web_lg"]
            success = False
            self.analyzer = None
            
            # Note: We attempt to initialize AnalyzerEngine. 
            # If it fails, it usually means the default model (lg) is missing.
            # We then try to explicitly load what's available.
            try:
                self.analyzer = AnalyzerEngine(default_score_threshold=0.5)
                success = True
            except Exception as e:
                logger.warning(f"Default Presidio initialization failed: {e}. Trying fallbacks...")
                for model in models:
                    try:
                        import spacy
                        if spacy.util.is_package(model):
                            # We can pass specific nlp_engine configuration to Presidio
                            # but for now, we'll suggest downloading the model if it fails.
                            logger.info(f"Found model {model}, attempting to use it.")
                            # AnalyzerEngine(default_score_threshold=0.35) should work if sm is the only one.
                            self.analyzer = AnalyzerEngine(default_score_threshold=0.5)
                            success = True
                            break
                    except Exception as model_e:
                        logger.warning(f"Could not use {model}: {model_e}")
            
            if not success:
                logger.error("No spaCy models found for Presidio. PII detection may be limited.")
                # We'll try one last time with default
                self.analyzer = AnalyzerEngine()
            
            # --- ADD CUSTOM RECOGNIZERS HERE ---
            # 1. Employee ID in format EMP-1234
            emp_pattern = Pattern(name="emp_pattern", regex=r"EMP-\d{4}", score=0.85)
            emp_recognizer = PatternRecognizer(supported_entity="EMPLOYEE_ID", patterns=[emp_pattern])
            
            # 2. Indian Aadhaar Card (10-12 digits with various separators)
            # Standard is 12 digits, but users sometimes use test data or 10 digits
            aadhaar_pattern = Pattern(name="aadhaar_pattern", regex=r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", score=0.85)
            aadhaar_recognizer = PatternRecognizer(
                supported_entity="IN_AADHAAR", 
                patterns=[aadhaar_pattern],
                context=["aadhaar", "aadhar", "uidai", "card number"]
            )
            
            # 3. Indian PAN Card (5 letters, 4 digits, 1 letter)
            pan_pattern = Pattern(name="pan_pattern", regex=r"[A-Z]{5}[0-9]{4}[A-Z]{1}", score=0.85)
            pan_recognizer = PatternRecognizer(supported_entity="IN_PAN", patterns=[pan_pattern], context=["pan", "income tax"])
            
            # 4. Indian Phone Number (+91, 0, or 10 digits)
            in_phone_pattern = Pattern(name="in_phone_pattern", regex=r"(?:\+91|0?)\s?[6-9]\d{4}\s?\d{5}", score=0.85)
            in_phone_recognizer = PatternRecognizer(supported_entity="IN_PHONE", patterns=[in_phone_pattern], context=["phone", "mobile", "call", "contact"])
            
            # 5. Generic API Key (10-64 chars of hex/alphanumeric)
            # Relaxed minimum length to catch shorter/numeric test keys
            api_key_pattern = Pattern(name="api_key_pattern", regex=r"\b[a-zA-Z0-9-]{20,64}\b", score=0.6)
            api_key_recognizer = PatternRecognizer(
                supported_entity="API_KEY", 
                patterns=[api_key_pattern],
                context=["api", "key", "token", "secret", "auth", "sk-"]
            )
            
            # 6. Uppercase Names (Common on ID cards)
            name_pattern = Pattern(name="caps_name_pattern", regex=r"\b[A-Z]{2,}(?:\s[A-Z]{2,})+\b", score=0.85)
            name_recognizer = PatternRecognizer(
                supported_entity="PERSON", 
                patterns=[name_pattern],
                context=["name", "son of", "daughter of", "wife of", "care of", "dob"]
            )
            
            # 7. Names following "name is" (Case insensitive for "name is")
            # We match the whole phrase and let our post-processor shrink it to just the name
            intro_name_pattern = Pattern(name="intro_name_pattern", regex=r"(?i)\bname is\s+[A-Z][a-zA-Z]+\b", score=0.85)
            intro_name_recognizer = PatternRecognizer(supported_entity="PERSON", patterns=[intro_name_pattern])
            
            # Add all to registry
            self.analyzer.registry.add_recognizer(emp_recognizer)
            self.analyzer.registry.add_recognizer(aadhaar_recognizer)
            self.analyzer.registry.add_recognizer(pan_recognizer)
            self.analyzer.registry.add_recognizer(in_phone_recognizer)
            self.analyzer.registry.add_recognizer(api_key_recognizer)
            self.analyzer.registry.add_recognizer(name_recognizer)
            self.analyzer.registry.add_recognizer(intro_name_recognizer)
            # -----------------------------------
            
            # The Anonymizer Engine replaces PII (default with <entity_type>)
            self.anonymizer = AnonymizerEngine()
            logger.info("Presidio initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing Presidio: {e}. Ensure spaCy model en_core_web_lg is downloaded.")
            self.analyzer = None
            self.anonymizer = None

    def redact_text(self, text: str, entities: list = None, language: str = "en") -> dict:
        if not self.analyzer or not self.anonymizer:
            raise RuntimeError("Presidio engines are not initialized properly.")

        if not text:
            return {
                "redacted_text": "",
                "findings": [],
                "risk_summary": {"total": 0, "high": 0, "medium": 0, "low": 0}
            }

        # Step 1: Detect PII
        # We increase the overlap threshold to favor our custom recognizers
        results = self.analyzer.analyze(text=text, entities=entities, language=language)
        
        # Custom extraction for "name is [Name]" to guarantee detection
        import re
        from presidio_analyzer import RecognizerResult
        intro_pattern = re.compile(r"(?i)\bname is\s+([A-Z][a-zA-Z]+)\b")
        for match in intro_pattern.finditer(text):
            name_start = match.start(1)
            name_end = match.end(1)
            
            # Create a RecognizerResult
            res = RecognizerResult(
                entity_type="PERSON",
                start=name_start,
                end=name_end,
                score=0.95 
            )
            results.append(res)
        
        # Post-process results to fix Spacy including introductory phrases in PERSON entities
        adjusted_results = []
        from presidio_analyzer import RecognizerResult
        
        IGNORE_PERSON_PHRASES = {
            "my name is", "my aadhaar is", "my aadhar is", 
            "and my pan is", "reach me at", "my employee id is", 
            "and my api key is", "my pan is"
        }
        
        for res in results:
            if res.entity_type == "PERSON":
                entity_text = text[res.start:res.end].strip()
                entity_text_lower = entity_text.lower()
                
                # Rule 1: Discard if it matches common introductory phrases
                if entity_text_lower in IGNORE_PERSON_PHRASES:
                    continue
                    
                # Rule 2: Discard if it ends with " is" (implies it's a phrase like "My Aadhaar is")
                if entity_text_lower.endswith(" is"):
                    continue
                    
                # Rule 3: Shrink if it contains " is " and has text after it
                if " is " in entity_text:
                    pos = entity_text.rfind(" is ")
                    new_start = res.start + pos + 4
                    if new_start < res.end:
                        new_res = RecognizerResult(
                            entity_type=res.entity_type,
                            start=new_start,
                            end=res.end,
                            score=res.score
                        )
                        adjusted_results.append(new_res)
                        continue
                        
            adjusted_results.append(res)
        results = adjusted_results
        
        # Filter overlaps: if two entities occupy the same space, pick the one with higher score
        # or favor specific Indian entities over generic ones
        final_results = []
        sorted_results = sorted(results, key=lambda x: (x.start, -(x.end - x.start), -x.score))
        
        last_end = -1
        for res in sorted_results:
            if res.start >= last_end:
                final_results.append(res)
                last_end = res.end
            else:
                # Potential overlap
                prev = final_results[-1]
                # If current has higher score and overlaps significantly, replace
                if res.score > prev.score:
                    final_results[-1] = res
                    last_end = res.end

        # Prepare findings for frontend (using keys expected by FindingsTable.jsx)
        findings = []
        risk_summary = {"total": len(final_results), "high": 0, "medium": 0, "low": 0}
        
        # Risk Priority Mapping
        HIGH_RISK_TYPES = {"IN_AADHAAR", "IN_PAN", "US_SSN", "CREDIT_CARD", "API_KEY", "CRYPTO"}
        MEDIUM_RISK_TYPES = {"EMAIL_ADDRESS", "PHONE_NUMBER", "IN_PHONE", "PERSON", "EMPLOYEE_ID"}
        LOW_RISK_TYPES = {"LOCATION", "DATE_TIME", "URL", "IP_ADDRESS", "NRP"}

        from html import escape

        for res in final_results:
            score_val = res.score
            ent_type = res.entity_type
            
            # Determine Risk Level based on Type and Score
            if ent_type in HIGH_RISK_TYPES:
                risk_level = "High"
            elif ent_type in MEDIUM_RISK_TYPES:
                risk_level = "Medium"
            elif ent_type in LOW_RISK_TYPES:
                risk_level = "Low"
            else:
                # Fallback for unknown types
                if score_val > 0.8:
                    risk_level = "Medium"
                else:
                    risk_level = "Low"
            
            # Adjust based on score extremes
            if risk_level == "Low" and score_val > 0.95 and ent_type not in LOW_RISK_TYPES:
                risk_level = "Medium"
            if risk_level == "Medium" and score_val < 0.4:
                risk_level = "Low"

            risk_summary[risk_level.lower()] += 1

            finding = {
                "detected_text": text[res.start:res.end],
                "pii_type": ent_type,
                "risk_level": risk_level,
                "source": "Presidio Analyzer",
                "score": score_val 
            }
            findings.append(finding)

        # Step 2: Anonymize the findings
        anonymized_result = self.anonymizer.anonymize(text=text, analyzer_results=final_results)
        
        # Step 3: Create highlighted HTML correctly
        # We need to escape the text first, then insert tags
        # To make it easy, we'll work backwards on the original text
        highlighted_html = escape(text)
        
        # We need to calculate indices in the ESCAPED string, which is hard.
        # Better: Build the HTML by chunks
        html_chunks = []
        current_pos = 0
        sorted_for_html = sorted(final_results, key=lambda x: x.start)
        
        for res in sorted_for_html:
            # Text before the entity
            html_chunks.append(escape(text[current_pos:res.start]))
            # The entity itself wrapped in a span
            tag_class = "bg-red-500/30 text-red-200 px-1 rounded cursor-help"
            entity_text = escape(text[res.start:res.end])
            html_chunks.append(f'<span class="{tag_class}" title="{res.entity_type}">{entity_text}</span>')
            current_pos = res.end
            
        # Remaining text
        html_chunks.append(escape(text[current_pos:]))
        highlighted_html = "".join(html_chunks)

        return {
            "redacted_text": anonymized_result.text,
            "highlighted_html": highlighted_html,
            "findings": findings,
            "risk_summary": risk_summary
        }

# We instantiate a singleton of out service here to be used by the router
text_redactor = TextRedactorService()
