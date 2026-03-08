print("Importing text_redactor...")
from services.text_redactor import text_redactor
print("text_redactor imported.")

def test_rectification():
    test_text = "my API key is 2563479278 and my Aadhar card number is 984-876-7789"
    print(f"Input: {test_text}")
    print("Running redact_text...")
    result = text_redactor.redact_text(test_text)
    print("redact_text finished.")
    
    print("\nRedacted Output:")
    print(result['redacted_text'])
    
    print("\nFindings:")
    for f in result['findings']:
        print(f"- {f['entity_type']}: {f['text']} (Score: {f['score']})")

if __name__ == "__main__":
    test_rectification()
