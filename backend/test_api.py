import urllib.request
import json

url = "http://localhost:8000/api/redact/text"
data = {"text": "My name is John Doe and my phone number is 555-0100."}
encoded_data = json.dumps(data).encode('utf-8')

req = urllib.request.Request(url, data=encoded_data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        result = response.read().decode('utf-8')
        print(f"Status Code: {response.getcode()}")
        print(f"Response: {result}")
except Exception as e:
    print(f"Error: {e}")
