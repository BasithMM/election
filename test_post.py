import urllib.request
import urllib.parse
data = urllib.parse.urlencode({ "admissionNo": "1234", "voterName": "Node Test", "presidentName": "MUHAMMED JURAIJ", "vicePresidentName": "ABDUL BASITH MM", "secretaryName": "SHAHAFAS IBI", "jointSecretaryName": "HADI AMEEN P", "treasurerName": "HABEEBU RAHMAN E" }).encode()
req = urllib.request.Request("https://script.google.com/macros/s/AKfycbw_1WvYJajRusDd9nB5w-dGiw3OGpdKo_wwZBxLg_lgA_Akr9jJQcu6Q7CBrQtKG1yrQw/exec", data=data)
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print("Error:", e)
