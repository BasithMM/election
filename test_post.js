const voteData = { admissionNo: "1234", voterName: "Node Test", presidentName: "Basith", secretaryName: "Zainab Malik", treasurerName: "Fatima Al Zahra" };

const formData = new URLSearchParams();
for (const key in voteData) {
    formData.append(key, voteData[key]);
}

fetch("https://script.google.com/macros/s/AKfycbwKP3DJyVOg3RdfT9Z4K7fjcj4H1M9o4Q7QkQ7rHfc34SjEirOEvU5xBT-jw4WLUI_w7Q/exec", {
    method: "POST",
    body: formData
})
.then(res => res.text())
.then(console.log)
.catch(console.error);
