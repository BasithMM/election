import urllib.request
import urllib.parse
data = urllib.parse.urlencode({ "admissionNo": "1234", "voterName": "Node Test", "presidentName": "Basith", "secretaryName": "Zainab Malik", "treasurerName": "Fatima Al Zahra" }).encode()
req = urllib.request.Request("https://script.google.com/macros/s/AKfycbyMT54QiFNu--RAjXk7gJDJ4MPppSKNEnXKSB7-ip8cgEa28qV1NgtSdgeO5SaMTTo/exec", data=data)
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print("Error:", e)
