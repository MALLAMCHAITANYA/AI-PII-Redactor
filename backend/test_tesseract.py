import pytesseract
try:
    print("Tesseract path:", pytesseract.pytesseract.tesseract_cmd)
    version = pytesseract.get_tesseract_version()
    print("Version:", version)
except Exception as e:
    print("Error:", e)
