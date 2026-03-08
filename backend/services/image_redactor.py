import cv2
import numpy as np
import pytesseract
from PIL import Image
import io
import logging
from .text_redactor import text_redactor # Reuse the initialized Presidio instance

logger = logging.getLogger(__name__)

# NOTE: For Windows Users, you often need to specify the path to the Tesseract executable
# If pytesseract fails to find it in your PATH, uncomment and set this to your installation path:
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

class ImageRedactorService:
    
    def __init__(self):
        # We rely on the existing TextRedactorService for PII detection
        self.text_analyzer = text_redactor.analyzer
        
    def redact_image(self, image_bytes: bytes, entities: list = None) -> bytes:
        """
        Takes raw image bytes, performs OCR to find text bounding boxes,
        analyzes text for PII using Presidio, blurs PII regions via OpenCV,
        and returns the modified image bytes.
        """
        if not self.text_analyzer:
            raise RuntimeError("Text analyzer not initialized. Cannot redact image.")
            
        # 1. Convert bytes to OpenCV Image format (numpy array)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Could not decode image bytes.")
            
        # 2. Extract Data using Tesseract OCR (Output provides words, coordinates, confidence)
        # We want word-level bounding boxes so we can redact specific words
        try:
            ocr_data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        except pytesseract.TesseractNotFoundError:
            raise RuntimeError(
                "Tesseract OCR is not installed or not in your PATH. "
                "For Windows, please install it from https://github.com/UB-Mannheim/tesseract/wiki "
                "and uncomment line 13 in image_redactor.py to set the path."
            )
        
        text_lines = []
        box_data = []

        # Tesseract returns data in a flat list for every detected element (block, par, line, word)
        # We need to construct full sentences/lines so Presidio has context to analyze
        # A phone number "123-456" might be 3 separate "words", so context is crucial.
        
        n_boxes = len(ocr_data['text'])
        current_line = ""
        current_line_boxes = []
        
        for i in range(n_boxes):
            text = ocr_data['text'][i].strip()
            # Ignore empty strings and low confidence
            if int(ocr_data['conf'][i]) > -1 and text:
                (x, y, w, h) = (ocr_data['left'][i], ocr_data['top'][i], ocr_data['width'][i], ocr_data['height'][i])
                
                # Append to current line string
                # We record the start and end character index of each word in the line string
                start_idx = len(current_line)
                word_to_add = text + " "
                current_line += word_to_add
                end_idx = start_idx + len(text)
                
                current_line_boxes.append({
                    "text": text,
                    "x": x, "y": y, "w": w, "h": h,
                    "start": start_idx,
                    "end": end_idx
                })
                
            # If line_num changes in the next iteration or we are at the end, process the line
            if i == n_boxes - 1 or (i < n_boxes - 1 and ocr_data['line_num'][i+1] != ocr_data['line_num'][i]):
                if current_line.strip():
                    text_lines.append(current_line)
                    box_data.append(current_line_boxes)
                    current_line = ""
                    current_line_boxes = []

        # 3. Analyze Text Lines with Presidio and Blur appropriately
        for line_text, boxes in zip(text_lines, box_data):
            # Analyzer requires a string
            results = self.text_analyzer.analyze(text=line_text, entities=entities, language="en")
            
            for result in results:
                entity_start = result.start
                entity_end = result.end
                
                # Find which boxes (words) fall within this entity's character range
                for box in boxes:
                    # If there's overlap in character indices, this box is part of the PII
                    if max(entity_start, box["start"]) < min(entity_end, box["end"]):
                        x, y, w, h = box["x"], box["y"], box["w"], box["h"]
                        # Extract the region-of-interest (ROI)
                        roi = img[y:y+h, x:x+w]
                        
                        # Apply heavy Gaussian Blur
                        try:
                            # Kernel size must be odd and positive (e.g., 51 for strong blur)
                            blurred_roi = cv2.GaussianBlur(roi, (51, 51), 0)
                            img[y:y+h, x:x+w] = blurred_roi
                        except Exception as e:
                            logger.error(f"Error blurring region: {e}")
                            # Fallback: draw a solid black rectangle
                            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 0, 0), -1)

        # 4. Convert back to bytes
        is_success, buffer = cv2.imencode(".jpg", img)
        if not is_success:
            raise Exception("Failed to encode blurred image.")
            
        return buffer.tobytes()

image_redactor = ImageRedactorService()
