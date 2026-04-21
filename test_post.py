import urllib.request
import urllib.parse
data = urllib.parse.urlencode({ "admissionNo": "1234", "voterName": "Node Test", "presidentName": "MUHAMMED JURAIJ", "vicePresidentName": "ABDUL BASITH MM", "secretaryName": "SHAHAFAS IBI", "jointSecretaryName": "HADI AMEEN P", "treasurerName": "HABEEBU RAHMAN E" }).encode()
req = urllib.request.Request("https://script.google.com/macros/s/AKfycbxQpG3hXIk74zq7HKfZ3tMpqn76knF3O6UQc47Qs346u6QVW9qMSdY-WWKn8WynZkYZJA/exec", data=data)
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print("Error:", e)
