let currentUser = null;
let userName = "";
let isSaving = false;
let doelChart;
let trendChart;

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  //firebaseconfig
    apiKey: "AIzaSyBFSwN7sbLcHojfXQC-GHboUn-sMEX_ysg",
    authDomain: "gezondheidsmetingen.firebaseapp.com",
	databaseURL: "https://gezondheidsmetingen-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "gezondheidsmetingen",
    storageBucket: "gezondheidsmetingen.firebasestorage.app",
    messagingSenderId: "303121151963",
    appId: "1:303121151963:web:ba93b85a9458e61fd999fe"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

window.login = function(){
    signInWithPopup(auth, provider)
        .then(result => {
            console.log("Ingelogd:", result.user.email);
        })
        .catch(error => {
            console.error(error);
        });
}
window.logout = function(){
    signOut(auth)
        .then(() => {
            console.log("Uitgelogd");
        })
        .catch(error => {
            console.error(error);
        });
}
onAuthStateChanged(auth, (user) => {
    currentUser = user;

    if (user) {
		syncOfflineData();
        userName = user.displayName || user.email;
		document.body.style.display = "block";
        document.getElementById("userInfo").innerText = userName;
        document.getElementById("loginBtn").style.display = "none";
        document.getElementById("logoutBtn").style.display = "inline-block";

        console.log("Ingelogd:", userName);

        // 🔥 METINGEN
        onValue(ref(db, "metingen/" + user.uid), (snapshot) => {
            let data = snapshot.val();
            firebaseData = data ? Object.values(data) : [];
            toonLijst();
            toonTabel();
            tekenGrafiek();
        });

        // 🔥 DOEL
        onValue(ref(db, "doel/" + user.uid), (snapshot) => {
            doelData = snapshot.val() || {};
            updateDoelUI();
        });

        // 🔥 DAGDATA
        onValue(ref(db, "dagData/" + user.uid), (snapshot) => {
            let data = snapshot.val();
            dagDataFirebase = data ? Object.values(data) : [];
            toonDagTabel();
            updateDoelUI();
        });

    } else {
	
		document.body.style.display = "none";
        document.getElementById("userInfo").innerText = "";
        document.getElementById("loginBtn").style.display = "inline-block";
        document.getElementById("logoutBtn").style.display = "none";
    }
});
// test of het werkt
//console.log("Firebase connected");

let firebaseData = [];
//let paginaMetingen = 0;
const perPagina = 10;
//let paginaDagen = 0;

window.paginaDagen = 0;
window.paginaMetingen = 0;

window.onload = function() {
// invoervelden maken
const container = document.getElementById("inputs");
velden.forEach((v,i) => {

if(
    v === "vetmassa" ||
    v === "watermassa" ||
    v === "vetvrije_massa"
){
    return;
}

    container.innerHTML += `
    <div class="veld">
        <label class="titel">${labels[i]}</label>
        <input type="number" step="0.1" id="${v}">
    </div>
    `;
});

const grafiekContainer = document.getElementById("grafiekSelectie");

const keuze = document.getElementById("keuze");

velden.forEach((v,i)=>{
    keuze.innerHTML += `<option value="${v}">${labels[i]}</option>`;
});

document.getElementById("keuze").value = velden[0];
document.getElementById("doel").style.display="none";

velden.forEach((v,i) => {
    grafiekContainer.innerHTML += `
        <label class="grafiek-item">
            <input type="checkbox" value="${v}" checked>
            ${labels[i]}
        </label>
    `;
});

const combiContainer = document.getElementById("combiSelectie");

velden.forEach((v,i) => {
combiContainer.innerHTML += `
			<label class="combi-item">
				<input 
					type="checkbox" 
					value="${v}" 
					${i === 0 ? "checked" : ""}
					onchange="updateSelectieLabel(); tekenCombi();"
				>
				${labels[i]}
			</label>
		`;
});
updateSelectieLabel();

	toonLijst();
	showTab("metingen");
	updateDoelUI();
	toonDagTabel();
	document.getElementById("doelDatum").valueAsDate = new Date();
    // grafiek pas tekenen NA tab zichtbaar
    setTimeout(() => tekenGrafiek(), 200);
}

/* ================= TAB NAVIGATIE ================= */
window.showTab = function(tab){

    // alle tabs verbergen
    document.querySelectorAll(".tab").forEach(t => {
        t.style.display = "none";
    });

    // juiste tab tonen
    document.getElementById(tab).style.display = "block";

    // actieve knop highlight
    document.querySelectorAll(".tabs button").forEach(b=>{
        b.classList.remove("active");
    });

    document.getElementById("tabBtn"+capitalize(tab)).classList.add("active");

    // 🔥 scroll naar boven (UX!)
    window.scrollTo({ top: 0, behavior: "smooth" });

    // 🔥 kleine delay voor betere rendering
    if(tab === "metingen"){
        setTimeout(() => toonTabel(), 50);
    }

    if(tab === "analyse"){
        setTimeout(() => tekenGrafiek(), 100);
    }
	
	// 🔥 mobile nav active state
	document.querySelectorAll(".bottom-nav button").forEach(b=>{
		b.classList.remove("active");
	});

	let navBtn = document.getElementById("nav"+capitalize(tab));
	if(navBtn){
		navBtn.classList.add("active");
	}
}

function capitalize(s){
    return s.charAt(0).toUpperCase()+s.slice(1);
}


Chart.register(ChartDataLabels);
Chart.register(window['chartjs-plugin-annotation']);

let grafiekModus = "single"; // "single" of "combi"

const velden = [
"gewicht",
"bmi",
"lichaamsvrij_vet",
"vetmassa",
"vetvrije_massa",
"waterpercentage",
"watermassa",
"spiermassa",
"spierscore",
"botmassa",
"kcal",
"kj",
"leeftijd",
"visceraal_vet",
"buikomvang"
];

const labels = [
"Gewicht",
"BMI",
"Vetpercentage",
"Vetmassa (kg)",
"Vetvrije massa (kg)",
"Waterpercentage",
"Watermassa (kg)",
"Spiermassa",
"Spierscore",
"Botmassa",
"Kcal behoefte",
"KJ behoefte",
"Leeftijd",
"Viscerale vetscore",
"Buikomvang"
];


function saveOffline(entry){
    let queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
    queue.push(entry);
    localStorage.setItem("offlineQueue", JSON.stringify(queue));
}

function syncOfflineData(){
    if (!currentUser) return;

    let queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");

    if(queue.length === 0) return;

    console.log("Syncing offline data:", queue.length);

    queue.forEach(entry => {
        set(ref(db, "metingen/" + currentUser.uid + "/" + entry.id), entry);
    });

    localStorage.removeItem("offlineQueue");
}
// data ophalen
function getData(){
    return firebaseData;
}

// opslaan
window.opslaan = function(){
	if (!currentUser) return;
	
	if (isSaving) return; // 🔒 blokkeer dubbel klikken
    isSaving = true;
	let btn = document.getElementById("opslaanBtn");
	btn.disabled = true;
	
    let data = getData();

    // validatie: datum verplicht
    let datum = document.getElementById("datum").value;
    if(!datum){
        alert("Vul een datum in");
		isSaving = false;
		btn.disabled = false;
        return;
    }

    // entry opbouwen
    let entry = {
		id: Date.now(),
        datum: datum
    };

    velden.forEach(v => {

	if(
		v === "vetmassa" ||
		v === "watermassa" ||
		v === "vetvrije_massa"
	){
		return;
	}

    let value = document.getElementById(v).value;
    entry[v] = value === "" ? null : parseFloat(value);
	});

	// afgeleide waarden berekenen
	if(entry.gewicht && entry.lichaamsvrij_vet != null){
		entry.vetmassa =
			Number(
				(entry.gewicht * entry.lichaamsvrij_vet / 100)
				.toFixed(1)
			);
	}

	if(entry.gewicht && entry.vetmassa != null){
		entry.vetvrije_massa =
			Number(
				(entry.gewicht - entry.vetmassa)
				.toFixed(1)
			);
	}

	if(entry.gewicht && entry.waterpercentage != null){
		entry.watermassa =
			Number(
				(entry.gewicht * entry.waterpercentage / 100)
				.toFixed(1)
			);
}

    let editIndex = localStorage.getItem("editIndex");

	if(editIndex !== null){
		editIndex = parseInt(editIndex);

		if(!isNaN(editIndex)){
			// bestaande entry overschrijven
			entry.id = editIndex; // behoud zelfde ID
		}

		localStorage.removeItem("editIndex");

	} else {
		// 🔒 voorkom dubbele invoer (zelfde datum)
		let bestaatAl = data.some(d => d.datum === datum);

		if(bestaatAl){
			alert("Er bestaat al een meting op deze datum");
			isSaving = false;
			btn.disabled = false;
			return;
		}
	}

    if (navigator.onLine) {
    set(ref(db, "metingen/" + currentUser.uid + "/" + entry.id), entry);
	} else {
		console.log("Offline opgeslagen");
		saveOffline(entry);
	}

    // formulier resetten
    resetForm();
	setTimeout(() => {
		isSaving = false;
		btn.disabled = false;
	}, 800);
}

let chart;

function movingAverage(data, windowSize = 3){
    let result = [];

    for(let i = 0; i < data.length; i++){
        let start = Math.max(0, i - windowSize + 1);
        let subset = data.slice(start, i + 1);

        let avg = subset.reduce((a,b)=>a+b,0) / subset.length;
        result.push(avg);
    }

    return result;
}

	function getWaarde(d, veld){

    if(veld === "vetmassa"){
        if(d.vetmassa != null) return d.vetmassa;

        return d.gewicht && d.lichaamsvrij_vet != null
            ? Number((d.gewicht * d.lichaamsvrij_vet / 100).toFixed(1))
            : null;
    }
	
	if(veld === "vetvrije_massa"){

    if(d.vetvrije_massa != null){
        return d.vetvrije_massa;
    }

    if(d.gewicht && d.lichaamsvrij_vet != null){
        return Number(
            (
                d.gewicht -
                (d.gewicht * d.lichaamsvrij_vet / 100)
            ).toFixed(1)
        );
    }

    return null;
	}

    if(veld === "watermassa"){
        if(d.watermassa != null) return d.watermassa;

        return d.gewicht && d.waterpercentage != null
            ? Number((d.gewicht * d.waterpercentage / 100).toFixed(1))
            : null;
    }

    return d[veld];
	}
	
// enkele grafiek
window.tekenGrafiek = function(){
	

    grafiekModus = "single";

    let data = getData().sort((a,b) => new Date(a.datum) - new Date(b.datum));
    let keuze = document.getElementById("keuze").value;
    let index = velden.indexOf(keuze);

    let datums = data.map(d => formatDatum(d.datum));
    let waarden = data.map(d => getWaarde(d, keuze));
	let trend = movingAverage(waarden);

    if(chart) chart.destroy();

    chart = new Chart(document.getElementById("grafiek"), {
        type: "line",
        data: {
            labels: datums,
			datasets: [
				{
					label: labels[index],
					data: waarden,
					borderColor: getKleur(keuze),
					fill: false,
					borderWidth: 2,
					pointRadius: 2,
					tension: 0.3
				},
				{
					label: "Trend",
					data: trend,
					hidden: true,
					borderColor: "rgba(0,0,0,0.5)",
					borderDash: [5,5],
					fill: false,
					pointRadius: 0,
					tension: 0.3
				}
			]
        },
        options: {
            responsive: true,
			legend: {
				labels: {
					padding: 20,
					boxWidth: 20,
					font: 
					{
						size: 14
					}
				}
			},
            plugins: {
                datalabels: {
                    align: 'top',
                    anchor: 'end',
                    formatter: function(value) {
                        return value.toFixed(1);
                    },
                    font: {
                        size: 10
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: "x"
                    },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: "x"
                    }
                }
            }
        }
    });
}

// gecombineerde grafiek
window.tekenCombi = function(){
    grafiekModus = "combi";

    let data = getData().sort((a,b) => new Date(a.datum) - new Date(b.datum));
    let datums = data.map(d => d.datum);

    // geselecteerde velden ophalen
    let selected = Array.from(
        document.querySelectorAll("#combiSelectie input:checked")
    ).map(cb => cb.value);

    if(selected.length === 0){
        alert("Selecteer minimaal één meting");
        return;
    }

    let datasets = selected.map(v => {
        let i = velden.indexOf(v);

        return {
				label: labels[i],
				data: data.map(d => getWaarde(d, v)),
				borderColor: getKleur(v),
				fill: false,
				borderWidth: 2,
				pointRadius: 2,
				tension: 0.3,
				yAxisID: (v === "kcal" || v === "kj") ? "y1" : "y"
        };
    });

    if(chart) chart.destroy();

    chart = new Chart(document.getElementById("grafiek"), {
        type: "line",
        data: {
            labels: datums,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
				datalabels: {
					align: 'top',
					anchor: 'end',
					formatter: function(value, context) {
					let data = context.dataset.data;
					let index = context.dataIndex;

					if(index === data.length - 1){
						return value.toFixed(1);
					}
					return "";
				},
					font: {
						size: 9
					}
				},
                legend: {
                    display: true
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: "x"
                    },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: "x"
                    }
                }
            },
			scales: {
				y: {
					type: 'linear',
					position: 'left'
				},
				y1: {
					type: 'linear',
					position: 'right',
					grid: {
						drawOnChartArea: false
					}
				}
			}
        }
    });
}

// initialiseren
tekenGrafiek();

window.exportPDF = async function(){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let data = getData();
	
	// ===== DAGDATA LAATSTE MAAND =====
	let dagData = getDagData();

	let now = new Date();
	let maandGeleden = new Date();
	maandGeleden.setDate(now.getDate() - 30);

	dagData = dagData.filter(d => new Date(d.datum) >= maandGeleden);

	// sorteren
	dagData.sort((a,b) => new Date(a.datum) - new Date(b.datum));

	// ===== WEEK GROEPERING =====
	function getWeekNumber(d){
		let date = new Date(d);
		date.setHours(0,0,0,0);
		date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
		let week1 = new Date(date.getFullYear(),0,4);
		return 1 + Math.round(((date - week1)/86400000 - 3 + (week1.getDay()+6)%7)/7);
	}

	let weken = {};

	dagData.forEach(d=>{
		let week = getWeekNumber(d.datum);

		if(!weken[week]) weken[week] = [];
		weken[week].push(d);
	});

    if(data.length === 0){
        alert("Geen data om te exporteren");
        return;
    }

	
    // ===== TITEL =====
    doc.setFontSize(18);
    doc.text("Gezondheidsrapport", 10, 10);

    // ===== TABEL =====
    doc.setFontSize(7);

    let colWidth = 14;
    let y = 20;

    let headers = ["Datum", ...labels];

    headers.forEach((h,i)=>{
        doc.text(h.substring(0,10), 10 + i*colWidth, y);
    });

    y += 5;

    data.forEach(d=>{
        let row = [
            formatDatum(d.datum),
            ...velden.map(v => d[v])
        ];

        row.forEach((cell,i)=>{
            doc.text(String(cell).substring(0,10), 10 + i*colWidth, y);
        });

        y += 5;

        if(y > 280){
            doc.addPage();
            y = 10;
        }
    });

    // ===== GRAFIEKEN SELECTIE =====
    let selected = Array.from(document.querySelectorAll("#grafiekSelectie input:checked"))
        .map(cb => cb.value);

    doc.addPage();

    let grafiekIndex = 0;

    for(let key of selected){

        let labelIndex = velden.indexOf(key);

        let tempCanvas = document.createElement("canvas");
		tempCanvas.width = 1000;
		tempCanvas.height = 500;
		let ctx = tempCanvas.getContext("2d");
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

		new Chart(tempCanvas, {
			type: "line",
			data: {
				labels: data.map(d => formatDatum(d.datum)),
				datasets: [{
					label: labels[labelIndex],
					data: data.map(d => d[key]),
					borderColor: getKleur(key),
					fill: false,
					borderWidth: 2,
					pointRadius: 2,
					tension: 0.3
				}]
			},
			options: {
				animation: false,
				responsive: false
			},
			plugins: [{
				id: 'whiteBackground',
				beforeDraw: (chart) => {
					const ctx = chart.ctx;
					ctx.save();
					ctx.globalCompositeOperation = 'destination-over';
					ctx.fillStyle = '#ffffff';
					ctx.fillRect(0, 0, chart.width, chart.height);
					ctx.restore();
				}
			}]
		});

        await new Promise(r => setTimeout(r, 200));

        //let imgData = tempCanvas.toDataURL("image/png");
		let imgData = tempCanvas.toDataURL("image/jpeg", 0.85);

        let posY = (grafiekIndex % 2 === 0) ? 30 : 170;

        // Titel
        doc.setFontSize(12);
        doc.text(labels[labelIndex], 10, posY - 10);

        // Stats
        let stats = berekenStats(data, key);
        if(stats){
            doc.setFontSize(9);
            doc.text(
                `Min: ${stats.min}  Max: ${stats.max}  Gem: ${stats.avg}  Δ: ${stats.verschil}`,
                10,
                posY - 3
            );
        }

        doc.addImage(imgData, "JPEG", 10, posY, 180, 90);

        grafiekIndex++;

        if(grafiekIndex % 2 === 0){
            doc.addPage();
        }
    }
	
	// ===== STA AFDIAGRAM KCAL =====
	// ===== WEEK GRAFIEKEN =====
for(let week in weken){

    doc.addPage();

    let weekData = weken[week];

    let labels = [];
    let waarden = [];
    let patterns = [];
	let verschillen = [];
	let baselines = [];

    // start van week (maandag)
    let start = new Date(weekData[0].datum);
    start.setDate(start.getDate() - start.getDay() + 1);

    for(let i=0;i<7;i++){
        let dag = new Date(start);
        dag.setDate(start.getDate() + i);

        let datumStr = dag.toISOString().split("T")[0];
        let found = weekData.find(d => d.datum === datumStr);

        labels.push(formatDatum(datumStr));

        if(found){
			waarden.push(found.kcalIn);
			patterns.push(false);
			verschillen.push(found.verschil);
			baselines.push(found.totaalVerbruik);
		} else {
			waarden.push(2000);
			patterns.push(true);
			verschillen.push(null);
			baselines.push(2000);
		}
    }

    let canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 500;

    let ctx = canvas.getContext("2d");

    // patroon voor ontbrekende dagen
    function createStripePattern(ctx){
        let pCanvas = document.createElement("canvas");
        pCanvas.width = 10;
        pCanvas.height = 10;

        let pCtx = pCanvas.getContext("2d");
        pCtx.fillStyle = "#ffffff";
        pCtx.fillRect(0,0,10,10);

        pCtx.strokeStyle = "red";
        pCtx.lineWidth = 2;
        pCtx.beginPath();
        pCtx.moveTo(0,10);
        pCtx.lineTo(10,0);
        pCtx.stroke();

        return ctx.createPattern(pCanvas, "repeat");
    }

    let stripe = createStripePattern(ctx);

    let bgColors = waarden.map((v,i)=>{
        return patterns[i] ? stripe : "#2c7be5";
    });

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
			data: waarden,
			backgroundColor: bgColors,

			datalabels: {
				anchor: 'end',
				align: 'top',
				color: function(context){
				let i = context.dataIndex;

				if(patterns[i]) return "#999";

				let diff = verschillen[i];

				if(diff > 0) return "red";   // teveel gegeten
				return "green";              // tekort
			},
				font: {
					size: 14,
					weight: 'bold'
				},
				formatter: function(value, context) {
				let i = context.dataIndex;

				if(patterns[i]) return "";

				let kcal = Math.round(value);
				let diff = verschillen[i];

				if(diff == null) return kcal;

				let teken = diff > 0 ? "+" : "";
				let diffText = `${teken}${Math.round(diff)}`;

				return `${kcal}\n(${diffText})`;
			}
			}
		},
		    {
        type: "line",
        data: baselines,
        borderColor: "black",
        borderWidth: 2,
        borderDash: [6,6],
        pointRadius: 0,
        tension: 0
    }]
        },
        options: {
		animation: false,
		responsive: false,
		plugins: {
			legend: { display: false },
			datalabels: {
				clamp: true
			}
		},
            scales: {
				x: {
					ticks: {
						color: "#000",
						font: { size: 12 }
					}
				},
				y: {
					beginAtZero: true,

					suggestedMax: Math.max(...waarden) + 500,

					ticks: {
						color: "#000",
						font: { size: 12 }
					}
				}
			}
        },
        plugins: [{
            id: 'whiteBackground',
            beforeDraw: (chart) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        }]
    });

    await new Promise(r => setTimeout(r, 200));

    let img = canvas.toDataURL("image/jpeg", 0.85);

    doc.setFontSize(14);
    doc.text(`Week ${week} - kcal inname`, 10, 20);

    doc.addImage(img, "JPEG", 10, 30, 180, 90);
}

    doc.save(genereerBestandsnaam());
}

window.mailPDF = function(){
    alert("PDF wordt eerst gedownload. Voeg hem daarna toe in je mail.");

    exportPDF();

    window.location.href = "mailto:?subject=Mijn metingen&body=Zie bijlage (PDF).";
}

// datum formatteren naar NL
function formatDatum(datum){
    if(!datum) return "";
    let parts = datum.split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}



function getKleur(veld){
    const kleuren = {
        gewicht: "black",
        bmi: "purple",
        lichaamsvrij_vet: "orange",
        waterpercentage: "blue",
		vetmassa: "#ff6600",
		vetvrije_massa: "#228B22",
		watermassa: "#0088ff",
        spiermassa: "green",
        spierscore: "darkgreen",
        botmassa: "brown",
        kcal: "pink",
        kj: "magenta",
        leeftijd: "gray",
        visceraal_vet: "red",
        buikomvang: "darkorange"
    };

    return kleuren[veld] || "gray";
}

function berekenStats(data, veld){
    let waarden = data.map(d => d[veld]).filter(v => !isNaN(v));

    if(waarden.length === 0) return null;

    let min = Math.min(...waarden);
    let max = Math.max(...waarden);
    let avg = waarden.reduce((a,b)=>a+b,0) / waarden.length;
    let verschil = waarden[waarden.length-1] - waarden[0];

    return {
        min: min.toFixed(1),
        max: max.toFixed(1),
        avg: avg.toFixed(1),
        verschil: verschil.toFixed(1)
    };
}

// lijst tonen
function toonLijst(){
    let data = getData().sort((a,b) => new Date(b.datum) - new Date(a.datum));
    let select = document.getElementById("historieSelect");

    select.innerHTML = `<option value="">-- Kies een meting --</option>`;

    data.forEach((d, index) => {
        let datum = formatDatum(d.datum);

        select.innerHTML += `
            <option value="${index}">
				${datum} (Gewicht: ${d.gewicht})
			</option>
        `;
    });
}

window.selecteerMeting = function(){
    // nog leeg — kan later preview tonen
}

window.bewerkenGeselecteerd = function(){
    let index = document.getElementById("historieSelect").value;

    if(index === ""){
        alert("Kies eerst een meting");
        return;
    }

    bewerken(parseInt(index));
}

window.verwijderGeselecteerd = function(){
	if (!currentUser) return;
    let index = document.getElementById("historieSelect").value;

    if(index === ""){
        alert("Kies eerst een meting");
        return;
    }

    if(!confirm("Weet je zeker dat je deze meting wilt verwijderen?")) return;

    let data = getData();
    let item = data[index];

	remove(ref(db, "metingen/" + currentUser.uid + "/" + item.id));

}

// laden in formulier
function bewerken(index){
    let data = getData();
    let item = data[index];

    document.getElementById("datum").value = item.datum;

	velden.forEach(v => {

	if(
		v === "vetmassa" ||
		v === "watermassa" ||
		v === "vetvrije_massa"
	){
		return;
	}

		let el = document.getElementById(v);

		if(el){
			el.value = item[v] ?? "";
		}
	});

    // 🔑 sla ID op (niet index!)
    localStorage.setItem("editIndex", String(item.id));
}

// verwijderen
function verwijder(index){
	if (!currentUser) return;
    if(!confirm("Weet je zeker dat je deze meting wilt verwijderen?")) return;

    let data = getData();
    let item = data[index];

    remove(ref(db, "metingen/" + currentUser.uid + "/" + item.id));
}

toonLijst();

window.resetForm = function(){
    document.getElementById("datum").value = "";

	velden.forEach(v => {

	if(
		v === "vetmassa" ||
		v === "watermassa" ||
		v === "vetvrije_massa"
	){
		return;
	}

		let el = document.getElementById(v);

		if(el){
			el.value = "";
		}
	});
}

window.toggleGrafiek = function(){
    if(grafiekModus === "single"){
        tekenCombi();
        document.getElementById("combiBtn").innerText = "Toon enkele grafiek";
    } else {
        tekenGrafiek();
        document.getElementById("combiBtn").innerText = "Toon gecombineerde grafiek";
    }
}


window.toggleSelectie = function(){
    let div = document.getElementById("combiSelectie");
    let btn = document.getElementById("selectieBtn");

    if(div.style.display === "none"){
        div.style.display = "grid";
        btn.innerText = "Selecteer metingen ▲";
    } else {
        div.style.display = "none";
        btn.innerText = "Selecteer metingen ▼";
    }
}

window.updateSelectieLabel = function(){
    let selected = Array.from(
        document.querySelectorAll("#combiSelectie input:checked")
    );

    let btn = document.getElementById("selectieBtn");

    if(selected.length === 0){
        btn.innerText = "Selecteer metingen ▼";
    } else if(selected.length <= 2){
        btn.innerText = selected.map(cb => cb.parentNode.innerText.trim()).join(", ");
    } else {
        btn.innerText = selected.length + " metingen geselecteerd";
    }
}

function genereerBestandsnaam(){
    const nu = new Date();

    const jaar = nu.getFullYear();
    const maand = String(nu.getMonth() + 1).padStart(2, '0');
    const dag = String(nu.getDate()).padStart(2, '0');

    const uur = String(nu.getHours()).padStart(2, '0');
    const minuut = String(nu.getMinutes()).padStart(2, '0');

    return `gezondheidsrapport_${jaar}-${maand}-${dag}_${uur}-${minuut}.pdf`;
}
window.exportData = function(){
    let data = getData();
    let blob = new Blob([JSON.stringify(data)], {type: "application/json"});
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "metingen_backup.json";
    a.click();
}
window.importData = function(file){
	if (!currentUser) return;
    let reader = new FileReader();

    reader.onload = function(e){
        let data = JSON.parse(e.target.result);
        set(ref(db, "metingen/" + currentUser.uid), data);
        toonLijst();
        tekenGrafiek();
    };

    reader.readAsText(file);
}

function toonTabel(){

    let data = getData().sort((a,b) => new Date(b.datum) - new Date(a.datum));

    let start = paginaMetingen * perPagina;
    let eind = start + perPagina;

    let subset = data.slice(start, eind);

    let div = document.getElementById("tabel");

    let html = `
    <table class="compact">
        <tr>
            <th>Datum</th>
            <th>Gewicht</th>
            <th>Acties</th>
        </tr>
    `;

    subset.forEach((d) => {
        html += `
        <tr>
            <td>${formatDatum(d.datum)}</td>
            <td>${d.gewicht ?? ""}</td>
			<td>
				<button class="editBtn" data-id="${d.id}">✏️</button>
				<button class="deleteBtn" data-id="${d.id}">🗑️</button>
			</td>
        </tr>
        `;
    });

    html += "</table>";

    // paginatie knoppen
    html += `<div class="paginatie">`;
	html += `Pagina ${paginaMetingen + 1} `;

	if(paginaMetingen > 0){
		html += `<button id="prevMetBtn">←</button>`;
	}

	if(eind < data.length){
		html += `<button id="nextMetBtn">→</button>`;
	}

    html += `</div>`;

    div.innerHTML = html;
	
	// 🔥 bewerken
	document.querySelectorAll(".editBtn").forEach(btn => {
		btn.addEventListener("click", () => {
			let id = btn.dataset.id;
			bewerkenById(id);
		});
	});

	// 🔥 verwijderen
	document.querySelectorAll(".deleteBtn").forEach(btn => {
		btn.addEventListener("click", () => {
			let id = btn.dataset.id;
			verwijderById(id);
		});
	});

	// 🔥 paginatie
	let prevBtn = document.getElementById("prevMetBtn");
	if(prevBtn){
		prevBtn.addEventListener("click", () => {
			paginaMetingen--;
			toonTabel();
		});
	}

	let nextBtn = document.getElementById("nextMetBtn");
	if(nextBtn){
		nextBtn.addEventListener("click", () => {
			paginaMetingen++;
			toonTabel();
		});
	}
}

window.bewerkenById = function(id){
    let data = getData();
    let item = data.find(d => d.id == id);

    document.getElementById("datum").value = item.datum;

	velden.forEach(v => {

	if(
		v === "vetmassa" ||
		v === "watermassa" ||
		v === "vetvrije_massa"
	){
		return;
	}

		let el = document.getElementById(v);

		if(el){
			el.value = item[v] ?? "";
		}
	});

    localStorage.setItem("editIndex", String(item.id));
}

window.verwijderById = function(id){
	if (!currentUser) return;
    if(!confirm("Verwijderen?")) return;

    remove(ref(db, "metingen/" + currentUser.uid + "/" + id));
}

let doelData = {};
function getDoel(){
    return doelData;
}

window.slaDoelOp = function(){
	if (!currentUser) return;
    let kg = parseFloat(document.getElementById("doelKg").value);
    if(isNaN(kg)) return alert("Vul kg in");
	let startDatum = document.getElementById("doelStartDatum").value;
	let sportKcalWaarde = parseFloat(document.getElementById("sportKcalWaarde").value) || 0;

	if(!startDatum){
		alert("Kies een startdatum");
		return;
	}
	
    let kcal = kg * 7000;

	let doel = {
    kg: kg,
    kcal: kcal,
    startDatum: startDatum,
    sportKcalWaarde: sportKcalWaarde
	};

    set(ref(db, "doel/" + currentUser.uid), doel);

    updateDoelUI();
}

let dagDataFirebase = [];

function getDagData(){
    return dagDataFirebase;
}
window.slaDagOp = function(){
	if (isSaving) return;
	isSaving = true;
	if (!currentUser) return;
    let data = getDagData();

    let datum = document.getElementById("doelDatum").value;
    if(!datum) return alert("Kies een datum");

    let kcalIn = parseFloat(document.getElementById("kcalIn").value) || 0;
    let sport = document.getElementById("sport").checked;
    let stappen = parseInt(document.getElementById("stappen").value) || 0;

    // kcal behoefte uit metingen
    let behoefte = getBehoefteVoorDatum(datum);

    // 👉 JOUW LOGICA (gecorrigeerd)
    let doel = getDoel();

	let sportKcalWaarde =
		doel?.sportKcalWaarde || 0;

	let sportKcal =
		sport ? sportKcalWaarde : 0;
    let stappenKcal = stappen * 0.04;

	// totaal verbruik = basis + activiteit
	let totaalVerbruik = behoefte + sportKcal + stappenKcal;

	// verschil (negatief = goed, positief = slecht)
	let verschil = kcalIn - totaalVerbruik;

    // debug (mag blijven)
   // document.getElementById("dagResultaat").innerText =
   // `Behoefte: ${behoefte} | Sport: ${sportKcal} | Stappen: ${Math.round(stappenKcal)} | Totaal verbruik: ${Math.round(totaalVerbruik)} | Inname: ${kcalIn} | Resultaat: ${Math.round(verschil)}`;

    // 🔥 per dag maar 1 entry
    let index = data.findIndex(d => d.datum === datum);

	let entry = {
		datum,
		kcalIn,
		stappen,
		sport,
		behoefte,
		totaalVerbruik,
		verschil
	};

    if(index !== -1){
		set(ref(db, "dagData/" + currentUser.uid + "/" + datum), entry);
    } else {
        data.push(entry);
    }

    set(ref(db, "dagData/" + currentUser.uid + "/" + datum), entry);

    updateDoelUI();
    toonDagTabel();
	
	setTimeout(() => {
    isSaving = false;
}, 800);
}

function updateDoelUI(){

    let doel = getDoel();
    let data = getDagData();
	if(doel.startDatum){
    data = data.filter(d => d.datum >= doel.startDatum);
	}
	if(!doel || Object.keys(doel).length === 0) return;
	if(!data) return;
	
    if(doel.kg){
        document.getElementById("doelKg").value = doel.kg;
    }
		if(doel.startDatum){
		document.getElementById("doelStartDatum").value = doel.startDatum;
	}
	
	if(doel.sportKcalWaarde !== undefined){
    document.getElementById("sportKcalWaarde").value = doel.sportKcalWaarde;
	}
	let sportWaarde =
		doel.sportKcalWaarde || 450;

	document.getElementById("sportLabel").innerText =
		`Sport (±${sportWaarde} kcal)`;
		
    if(!doel.kcal) return;
	let totaal = data.reduce((sum,d)=>{
    return sum + ((d.verschil || 0) * -1);
	},0);

    let procent = Math.min((totaal / doel.kcal) * 100, 100);
	procent = Number(procent.toFixed(2));

    document.getElementById("doelInfo").innerText =
    `Doel: ${doel.kg} kg (${doel.kcal} kcal tekort)
	Vanaf: ${formatDatum(doel.startDatum)}`;

    document.getElementById("voortgangTekst").innerText =
    `Voortgang sinds ${formatDatum(doel.startDatum)}: ${procent}% (${Math.round(totaal)} kcal)`;

    tekenDoelGrafiek(procent);
	tekenTrendGrafiek();
	updateInzichten();
}



function tekenDoelGrafiek(procent){

    if(doelChart) doelChart.destroy();

    doelChart = new Chart(document.getElementById("doelGrafiek"), {
        type: "doughnut",
        data: {
            labels: ["Behaald","Resterend"],
            datasets: [{
                data: [procent, 100 - procent],
                backgroundColor: ["green","lightgray"]
            }]
        },
        options: {
			responsive: true,
			maintainAspectRatio: false,
			cutout: "70%",
			plugins: {
				legend: { display: false },
				datalabels: {
					color: "#000",
					font: {
						weight: "bold",
						size: 14
					},
					formatter: function(value) {
						return value.toFixed(2) + "%";
					}
				}
			}
		}
    });
}

function toonDagTabel(){

    let data = getDagData().sort((a,b) => new Date(b.datum) - new Date(a.datum));

    let start = paginaDagen * perPagina;
    let eind = start + perPagina;

    let subset = data.slice(start, eind);

    let div = document.getElementById("dagTabel");

    let html = `
    <table class="compact">
        <tr>
            <th>Datum</th>
            <th>Kcal</th>
            <th>Stappen</th>
            <th>Sport</th>
            <th>Resultaat</th>
            <th>Acties</th>
        </tr>
    `;

    subset.forEach(d => {
	let stappenKcal = Math.round(d.stappen * 0.04);
	let doel = getDoel();

	let sportKcalWaarde =
		doel?.sportKcalWaarde || 0;

	let sportKcal =
		d.sport ? sportKcalWaarde : 0;

	// haal behoefte op (laatste meting)
	let behoefte = getBehoefteVoorDatum(d.datum);

	let totaalVerbruik = behoefte + stappenKcal + sportKcal;
	//let verschil = d.kcalIn - totaalVerbruik;
	let verschil = d.verschil;
		html += `
		<tr>
			<td>${formatDatum(d.datum)}</td>

			<td>${d.kcalIn}</td>

			<td>
				${d.stappen} <br>
				<small>${stappenKcal} kcal</small>
			</td>

			<td>
				${d.sport ? "✔" : "✖"} <br>
				<small>${sportKcal} kcal</small>
			</td>

			<td>
				<small>
				${behoefte} + ${stappenKcal} + ${sportKcal} = ${Math.round(totaalVerbruik)}<br>
				${d.kcalIn} - ${totaalVerbruik} = <b style="color:${verschil > 0 ? 'red' : 'green'}">${Math.round(verschil)}</b>
				</small>
			</td>

		<td>
			<button class="editDagBtn" data-datum="${d.datum}">✏️</button>
			<button class="deleteDagBtn" data-datum="${d.datum}">🗑️</button>
		</td>
		</tr>`;
    });

    html += "</table>";

    html += `<div class="paginatie">`;
	html += `Pagina ${paginaDagen + 1} `;

if(paginaDagen > 0){
    html += `<button id="prevDagBtn">←</button>`;
}

if(eind < data.length){
    html += `<button id="nextDagBtn">→</button>`;
}

    html += `</div>`;

    div.innerHTML = html;
	
	// 🔥 dag bewerken
	document.querySelectorAll(".editDagBtn").forEach(btn => {
		btn.addEventListener("click", () => {
			bewerkDag(btn.dataset.datum);
		});
	});

	// 🔥 dag verwijderen
	document.querySelectorAll(".deleteDagBtn").forEach(btn => {
		btn.addEventListener("click", () => {
			verwijderDag(btn.dataset.datum);
		});
	});	
		
	
	let prevBtn = document.getElementById("prevDagBtn");
	if(prevBtn){
		prevBtn.addEventListener("click", () => {
			paginaDagen--;
			toonDagTabel();
		});
	}

	let nextBtn = document.getElementById("nextDagBtn");
	if(nextBtn){
		nextBtn.addEventListener("click", () => {
			paginaDagen++;
			toonDagTabel();
		});
	}
}

window.bewerkDag = function(datum){

    let data = getDagData();
    let d = data.find(x => x.datum === datum);

    if(!d) return;

    document.getElementById("doelDatum").value = d.datum;
    document.getElementById("kcalIn").value = d.kcalIn;
    document.getElementById("stappen").value = d.stappen;
    document.getElementById("sport").checked = d.sport;
}

window.verwijderDag = function(datum){
	if (!currentUser) return;
    if(!confirm("Verwijderen?")) return;

    let data = getDagData().filter(d => d.datum !== datum);

    remove(ref(db, "dagData/" + currentUser.uid + "/" + datum));

    updateDoelUI();
    toonDagTabel();
}

function tekenTrendGrafiek(){

	let data = getDagData();

	let doel = getDoel();

	if(doel.startDatum){
		data = data.filter(d => d.datum >= doel.startDatum);
	}

	data = data.sort((a,b) => new Date(a.datum) - new Date(b.datum));

    if(data.length === 0) return;

    let labels = [];
    let cumulatief = [];

    let totaal = 0;

    data.forEach(d => {

        // verschil is: kcalIn - totaalVerbruik
        // dus negatief = tekort → moet positief meetellen
        let bijdrage = (d.verschil || 0) * -1;

        totaal += bijdrage;

        labels.push(formatDatum(d.datum));
        cumulatief.push(Number(totaal.toFixed(2)));
    });

    if(trendChart) trendChart.destroy();

    trendChart = new Chart(document.getElementById("trendGrafiek"), {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Cumulatief kcal tekort",
                data: cumulatief,
                borderColor: "#2c7be5",
                fill: false,
				pointRadius: 2,
				borderWidth: 3,
                tension: 0.3
            }]
        },
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { 
					display: false 
				},
				// labels UIT voor trendgrafiek
				datalabels: {
					display: false
				}
			},
			scales: {
				y: {
					ticks: {
						callback: function(value) {
							return value.toFixed(2);
						}
					}
				},
				x: {
					ticks: {
						maxTicksLimit: 6
					}
				}
			}
		}
    });

    berekenVoorspelling(data, totaal);
}

function berekenVoorspelling(data, totaal){

    let doel = getDoel();
    if(!doel.kcal || data.length < 2){
        document.getElementById("voorspelling").innerText = "";
        return;
    }

    let dagen = data.length;

    // gemiddeld kcal tekort per dag
    let gemiddeld = totaal / dagen;

    if(gemiddeld <= 0){
        document.getElementById("voorspelling").innerText =
            "Je ligt momenteel niet op schema.";
        return;
    }

    let resterend = doel.kcal - totaal;

    if(resterend <= 0){
        document.getElementById("voorspelling").innerText =
            "🎉 Doel bereikt!";
        return;
    }

    let dagenNodig = Math.ceil(resterend / gemiddeld);

    let laatsteDatum = new Date(data[data.length - 1].datum);
    laatsteDatum.setDate(laatsteDatum.getDate() + dagenNodig);

    let voorspeld = formatDatum(laatsteDatum.toISOString().split("T")[0]);

    document.getElementById("voorspelling").innerText =
        `Bij huidig tempo bereik je je doel rond: ${voorspeld}`;
}

function updateInzichten(){

    let dagData = getDagData();
	let doel = getDoel();

	if(doel.startDatum){
		dagData = dagData.filter(d => d.datum >= doel.startDatum);
	}
    let metingen = getData();

    if(dagData.length === 0) {
        document.getElementById("inzichten").innerText = "Nog geen data";
        return;
    }

    // 🔹 1. Gemiddeld kcal tekort
    let totaal = dagData.reduce((sum,d)=>{
        return sum + ((d.verschil || 0) * -1);
    },0);

    let gemiddeld = totaal / dagData.length;

    // 🔹 2. Beste dag
    let besteDag = dagData.reduce((best, d)=>{
        let tekort = (d.verschil || 0) * -1;
        if(!best || tekort > best.tekort){
            return { datum: d.datum, tekort: tekort };
        }
        return best;
    }, null);

	// 🔹 3. Gewichtsverandering
	let gewichtTekst = "Niet genoeg data";

	// 🔥 alleen metingen vanaf doelstartdatum
	if(doel.startDatum){
		metingen = metingen.filter(m =>
			m.datum >= doel.startDatum
		);
	}

	if(metingen.length >= 2){

		let sorted = metingen.sort(
			(a,b)=> new Date(a.datum) - new Date(b.datum)
		);

		let eerste = sorted[0]?.gewicht;
		let laatste = sorted[sorted.length - 1]?.gewicht;

		if(eerste != null && laatste != null){

			let verschil = laatste - eerste;

			let kleur = verschil > 0 ? "red" : "green";
			let teken = verschil > 0 ? "+" : "";

			gewichtTekst = `
				<span style="color:${kleur}">
					${teken}${verschil.toFixed(1)} kg
				</span>
			`;
		}
	}

document.getElementById("inzichten").innerHTML = `
    <p>🎯 Doel gestart op: <b>${formatDatum(doel.startDatum)}</b></p>

    <p>📉 Gemiddeld tekort: 
        <b>${Math.round(gemiddeld)} kcal/dag</b>
    </p>

    <p>🔥 Beste dag: 
        <b>${formatDatum(besteDag.datum)}</b> 
        (${Math.round(besteDag.tekort)} kcal)
    </p>

    <p>⚖️ Gewichtsverandering: 
        <b>${gewichtTekst}</b>
    </p>
`;
}

window.exportExcel = function(){

    let metingen = getData();
    let dagData = getDagData();

    if(metingen.length === 0 && dagData.length === 0){
        alert("Geen data om te exporteren");
        return;
    }

    let wb = XLSX.utils.book_new();

    // 📊 Sheet 1: Metingen
    let metingenFormatted = metingen.map(m => ({
    datum: m.datum,
    gewicht: m.gewicht,
    bmi: m.bmi,
    lichaamsvrij_vet: m.lichaamsvrij_vet,
	vetmassa: m.vetmassa,
	waterpercentage: m.waterpercentage,
	watermassa: m.watermassa,
    spiermassa: m.spiermassa,
    spierscore: m.spierscore,
    botmassa: m.botmassa,
    kcal: m.kcal,
    kj: m.kj,
    leeftijd: m.leeftijd,
    visceraal_vet: m.visceraal_vet,
    buikomvang: m.buikomvang
	}));

	let ws1 = XLSX.utils.json_to_sheet(metingenFormatted);
    XLSX.utils.book_append_sheet(wb, ws1, "Metingen");

    // 📊 Sheet 2: Dagdata
    let dagFormatted = dagData.map(d => ({
    datum: d.datum,
    kcalIn: d.kcalIn,
    stappen: d.stappen,
    sport: d.sport
	}));

	let ws2 = XLSX.utils.json_to_sheet(dagFormatted);
    XLSX.utils.book_append_sheet(wb, ws2, "Dagdata");

    XLSX.writeFile(wb, "gezondheidsdata.xlsx");
}

window.importExcel = function(file){
    if (!currentUser) return;

    let reader = new FileReader();

    reader.onload = function(e){
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, { type: "array" });

        // ===== METINGEN =====
        let metingenSheet = workbook.Sheets["Metingen"];

        if(metingenSheet){

            let metingen = XLSX.utils.sheet_to_json(metingenSheet);

            // 🔹 bestaande data ophalen
            let bestaandeData = getData();

            // 🔹 map op datum → bestaande entry
            let bestaandeMap = {};
            bestaandeData.forEach(d => {
                bestaandeMap[d.datum] = d;
            });

            // 🔹 bijhouden welke datums nog bestaan
            let nieuweDatums = metingen.map(m => m.datum);

            // ===== TOEVOEGEN / UPDATEN =====
            metingen.forEach(entry => {

                if(!entry.datum) return;

                // bestaat al?
                let bestaand = bestaandeMap[entry.datum];

                if(bestaand){
                    // 🔁 update → behoud ID
                    entry.id = bestaand.id;
                } else {
                    // 🆕 nieuw → nieuwe ID
                    entry.id = Date.now() + Math.floor(Math.random()*1000);
                }

                set(ref(db, "metingen/" + currentUser.uid + "/" + entry.id), entry);
            });

            // ===== VERWIJDEREN =====
            bestaandeData.forEach(d => {
                if(!nieuweDatums.includes(d.datum)){
                    remove(ref(db, "metingen/" + currentUser.uid + "/" + d.id));
                }
            });
        }

        // ===== DAGDATA =====
        let dagSheet = workbook.Sheets["Dagdata"];

        if(dagSheet){

            let dagData = XLSX.utils.sheet_to_json(dagSheet);

            let bestaande = getDagData();
            let bestaandeDatums = bestaande.map(d => d.datum);
            let nieuweDatums = dagData.map(d => d.datum);

            // toevoegen / updaten
            dagData.forEach(entry => {
                if(entry.datum){
                    let behoefte = getBehoefteVoorDatum(entry.datum);

					let doel = getDoel();

					let sportKcalWaarde =
						doel?.sportKcalWaarde || 0;

					let sportKcal =
						entry.sport ? sportKcalWaarde : 0;
					let stappenKcal = (entry.stappen || 0) * 0.04;

					let totaalVerbruik = behoefte + sportKcal + stappenKcal;
					let verschil = (entry.kcalIn || 0) - totaalVerbruik;

					entry.behoefte = behoefte;
					entry.totaalVerbruik = totaalVerbruik;
					entry.verschil = verschil;

					set(ref(db, "dagData/" + currentUser.uid + "/" + entry.datum), entry);
                }
            });

            // verwijderen
            bestaande.forEach(d => {
                if(!nieuweDatums.includes(d.datum)){
                    remove(ref(db, "dagData/" + currentUser.uid + "/" + d.datum));
                }
            });
        }

        alert("Import voltooid (sync met Excel)");
    };

    reader.readAsArrayBuffer(file);
}

function getBehoefteVoorDatum(datum){

    let metingen = getData();

    if(metingen.length === 0) return 2000;

    // sorteer oplopend
    let sorted = metingen.sort((a,b) => new Date(a.datum) - new Date(b.datum));

    let gekozen = null;

    for(let m of sorted){
        if(m.datum <= datum){
            gekozen = m;
        } else {
            break;
        }
    }

    // fallback → eerste meting
    if(!gekozen){
        gekozen = sorted[0];
    }

    return gekozen.kcal || 2000;
}



// Laatste code. Alles hieronder updated eventuele lokaal opgeslagen code.

window.addEventListener("online", () => {
    console.log("Weer online → sync starten");
    syncOfflineData();
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(reg => {
        reg.update();
    });
}

document.addEventListener("visibilitychange", () => {

    if(document.visibilityState === "visible"){

        console.log("App opnieuw zichtbaar");

        // 🔥 UI opnieuw opbouwen
        toonLijst();
        toonTabel();
        toonDagTabel();

        updateDoelUI();
        updateInzichten();

        // 🔥 actieve grafiek opnieuw tekenen
        if(grafiekModus === "single"){
            tekenGrafiek();
        } else {
            tekenCombi();
        }
    }
});

window.addEventListener("pageshow", () => {

    console.log("Pagina opnieuw zichtbaar");

    toonLijst();
    toonTabel();
    toonDagTabel();

    updateDoelUI();
    updateInzichten();

    if(grafiekModus === "single"){
        tekenGrafiek();
    } else {
        tekenCombi();
    }
});

lucide.createIcons();