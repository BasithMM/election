const voteData = { admissionNo: "1234", voterName: "Node Test", presidentName: "Basith", secretaryName: "Zainab Malik", treasurerName: "Fatima Al Zahra" };

const formData = new URLSearchParams();
for (const key in voteData) {
    formData.append(key, voteData[key]);
}

fetch("https://script.google.com/macros/s/AKfycbw_1WvYJajRusDd9nB5w-dGiw3OGpdKo_wwZBxLg_lgA_Akr9jJQcu6Q7CBrQtKG1yrQw/exec", {
    method: "POST",
    body: formData
})
.then(res => res.text())
.then(console.log)
.catch(console.error);
