import requests
import sys

# PASTE YOUR KEY HERE BETWEEN THE QUOTES
API_KEY = "PASTE_YOUR_KEY_HERE"

if API_KEY == "PASTE_YOUR_KEY_HERE":
    print("❌ Please edit test_api.py and paste your API key on line 5!")
    sys.exit(1)

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}"
headers = {'Content-Type': 'application/json'}
data = {
    "contents": [{"parts":[{"text": "Say the word 'Hello' and nothing else."}]}]
}

print("Pinging Google Gemini API servers...")
response = requests.post(url, headers=headers, json=data)

if response.status_code == 200:
    print("\n✅ SUCCESS! YOUR API KEY IS WORKING PERFECTLY!")
    print("Gemini says:", response.json()['candidates'][0]['content']['parts'][0]['text'])
else:
    print("\n❌ FAILED!")
    print("Status Code:", response.status_code)
    print("Error Details:", response.text)
