const voteData = { admissionNo: "1234", voterName: "Node Test", presidentName: "Basith", secretaryName: "Zainab Malik", treasurerName: "Fatima Al Zahra" };

const formData = new URLSearchParams();
for (const key in voteData) {
    formData.append(key, voteData[key]);
}

fetch("https://script.google.com/macros/s/AKfycbyMT54QiFNu--RAjXk7gJDJ4MPppSKNEnXKSB7-ip8cgEa28qV1NgtSdgeO5SaMTTo/exec", {
    method: "POST",
    body: formData
})
.then(res => res.text())
.then(console.log)
.catch(console.error);
