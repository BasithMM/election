import urllib.request
import urllib.parse
data = urllib.parse.urlencode({ "admissionNo": "1234", "voterName": "Node Test", "presidentName": "Basith", "secretaryName": "Zainab Malik", "treasurerName": "Fatima Al Zahra" }).encode()
req = urllib.request.Request("https://script.google.com/macros/s/AKfycbwKP3DJyVOg3RdfT9Z4K7fjcj4H1M9o4Q7QkQ7rHfc34SjEirOEvU5xBT-jw4WLUI_w7Q/exec", data=data)
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print("Error:", e)
