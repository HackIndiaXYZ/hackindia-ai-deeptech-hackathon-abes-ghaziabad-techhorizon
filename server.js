const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/* -----------------------------
   Blockchain Verification (Demo)
----------------------------- */

const verifiedCompanies = [
    "google",
    "microsoft",
    "tcs",
    "infosys",
    "amazon",
    "abes"
];

function checkBlockchain(company) {

    if (!company) return "Not Verified ❌";

    if (verifiedCompanies.includes(company.toLowerCase())) {
        return "Verified ⛓️ (Blockchain)";
    }

    return "Not Verified ❌";
}

/* -----------------------------
   AI Scam Detection
----------------------------- */

function analyzeJob(company, jobText) {

    let score = 100;

    let text = (jobText || "").toLowerCase();

    // normalize text (remove punctuation)
    text = text.replace(/[^a-z0-9 ]/g, " ");

    const redFlags = [

        "immediate",
        "urgent",
        "no experience",
        "entry level",
        "earn",
        "daily income",
        "quick money",
        "guaranteed",
        "work from home",
        "remote",
        "data entry",
        "typing",
        "pdf",
        "excel",
        "form filling",
        "telegram",
        "whatsapp",
        "signal",
        "payment processing",
        "finance agent",
        "reshipper",
        "logistics assistant",
        "equipment reimbursement",
        "fake check",
        "registration fee",
        "training fee",
        "investment required",
        "be your own boss",
        "confidential client",
        "task job",
        "easy money",
        "instant payment",
        "mobile work"
    ];

    redFlags.forEach(flag => {
        if (text.includes(flag)) {
            score -= 10;
        }
    });

    if (!company || company.length < 3) {
        score -= 25;
    }

    if (company.includes(";") || company.includes(",")) {
        score -= 15;
    }

    let label = "Safe 🟢";

    if (score < 70) label = "Suspicious ⚠️";
    if (score < 40) label = "Likely Scam 🔴";

    return {
        score: Math.max(score,0),
        label: label
    };
}

/* -----------------------------
   API Route
----------------------------- */

app.post("/check", (req, res) => {

    const { company, jobText } = req.body;

    const result = analyzeJob(company, jobText);

    const blockchain = checkBlockchain(company);

    res.json({
        score: result.score,
        label: result.label,
        blockchainVerified: blockchain
    });
});

/* -----------------------------
   Start Server
----------------------------- */

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});