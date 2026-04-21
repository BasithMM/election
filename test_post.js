const voteData = {
    admissionNo: "1234",
    voterName: "Node Test",
    presidentName: "MUHAMMED JURAIJ",
    vicePresidentName: "ABDUL BASITH MM",
    secretaryName: "SHAHAFAS IBI",
    jointSecretaryName: "HADI AMEEN P",
    treasurerName: "HABEEBU RAHMAN E"
};

const formData = new URLSearchParams();
for (const key in voteData) {
    formData.append(key, voteData[key]);
}

fetch("https://script.google.com/macros/s/AKfycbxQpG3hXIk74zq7HKfZ3tMpqn76knF3O6UQc47Qs346u6QVW9qMSdY-WWKn8WynZkYZJA/exec", {
    method: "POST",
    body: formData
})
.then(res => res.text())
.then(console.log)
.catch(console.error);
