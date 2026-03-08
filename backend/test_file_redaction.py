import requests
import os

BASE_URL = "http://127.0.0.1:8000/api"

def test_file_redaction():
    file_path = "test_pii.txt"
    with open(file_path, "w") as f:
        f.write("My name is John Doe. My phone number is 9876543210. My email is john.doe@example.com.")
    
    try:
        with open(file_path, "rb") as f:
            files = {"file": (file_path, f, "text/plain")}
            response = requests.post(f"{BASE_URL}/redact/file", files=files)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Redacted Text:", data.get("redacted_text"))
            print("Findings Count:", len(data.get("findings", [])))
            print("Risk Summary:", data.get("risk_summary"))
        else:
            print("Error:", response.text)
            
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

if __name__ == "__main__":
    test_file_redaction()
