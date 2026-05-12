const form = document.getElementById("analysisForm");
const companyField = document.getElementById("company");
const jobTextField = document.getElementById("jobText");
const resultBox = document.getElementById("result");
const analyzeButton = document.getElementById("analyzeButton");

const samples = {
  legit: {
    company: "Google",
    jobText: "We are hiring a Senior Software Engineer with 5+ years experience in React and Node.js. Responsibilities include collaborating with product teams, writing clean code, and participating in architecture reviews. Requirements include strong JavaScript knowledge and experience with cloud platforms. Benefits include competitive salary, health insurance, and stock options."
  },
  scam: {
    company: "QuickPay Remote",
    jobText: "WORK FROM HOME! Earn $5000 daily with no experience. No resume required. Pay registration fee and start immediately. Contact us on WhatsApp only for fast approval."
  }
};

function clearResult() {
  resultBox.hidden = true;
  resultBox.replaceChildren();
}

function createTextElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

async function checkJob() {
  const company = companyField.value.trim();
  const jobText = jobTextField.value.trim();

  if (!company || !jobText) {
    displayError("Please fill in both company name and job description.");
    return;
  }

  const originalText = analyzeButton.textContent;
  analyzeButton.textContent = "Analyzing...";
  analyzeButton.disabled = true;
  clearResult();

  try {
    const response = await fetch("/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, jobText })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || `Request failed with HTTP ${response.status}`);
    }

    displayResults(data);
  } catch (error) {
    console.error("Analysis failed:", error);
    displayError(`${error.message} Make sure the project is running with "npm start" at http://localhost:3000.`);
  } finally {
    analyzeButton.textContent = originalText;
    analyzeButton.disabled = false;
  }
}

function displayResults(data) {
  const colorClass = data.score < 50 ? "danger" : data.score < 80 ? "warn" : "safe";
  const risk = data.risk || "unknown";

  resultBox.hidden = false;
  resultBox.replaceChildren();

  resultBox.append(
    createTextElement("div", `Trust Score: ${data.score}/100`, `score ${colorClass}`),
    createTextElement("div", `${data.label} (${risk} risk)`, `badge ${risk}`),
    buildSummary(data)
  );

  if (data.details?.redFlags?.length) {
    resultBox.append(buildIssueList(data.details.redFlags));
  }

  if (data.details?.textQuality?.issues > 0) {
    resultBox.append(createTextElement("div", `Text quality issues detected: ${data.details.textQuality.issues}`, "quality-note"));
  }
}

function buildSummary(data) {
  const summary = document.createElement("div");
  summary.className = "result-grid";

  const rows = [
    ["Company", getCompanyStatus(data.companyStatus)],
    ["Industry", capitalizeFirst(data.industry || "general")],
    ["Red Flags", `${data.redFlagsFound || 0} detected`],
    ["Contacts", formatContacts(data.contactsDetected || {})],
    ["Professional Score", `${data.details?.professionalScore ?? 0}/10`]
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    const strong = createTextElement("strong", `${label}: `);
    row.append(strong, document.createTextNode(value));
    summary.append(row);
  });

  return summary;
}

function buildIssueList(flags) {
  const wrapper = document.createElement("div");
  wrapper.className = "issue-list";
  wrapper.append(createTextElement("strong", "Detected issues"));

  const list = document.createElement("ul");
  flags.forEach((flag) => {
    const item = document.createElement("li");
    item.textContent = `${flag.flag} (${String(flag.category).toLowerCase()})`;
    list.append(item);
  });

  wrapper.append(list);
  return wrapper;
}

function displayError(message) {
  resultBox.hidden = false;
  resultBox.replaceChildren(
    createTextElement("div", "Analysis Failed", "score danger"),
    createTextElement("div", message, "result-grid text-danger")
  );
}

function fillSample(type) {
  const sample = samples[type];
  companyField.value = sample.company;
  jobTextField.value = sample.jobText;
  clearResult();
}

function getCompanyStatus(status) {
  const statusMap = {
    verified: "Verified",
    unknown: "Unknown",
    suspicious: "Suspicious",
    invalid: "Invalid"
  };
  return statusMap[status] || status || "Unknown";
}

function formatContacts(contacts) {
  const total = (contacts.emails?.length || 0) + (contacts.phones?.length || 0) + (contacts.urls?.length || 0);
  return total > 0 ? `${total} found` : "None detected";
}

function capitalizeFirst(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

document.getElementById("legitSample").addEventListener("click", () => fillSample("legit"));
document.getElementById("scamSample").addEventListener("click", () => fillSample("scam"));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  checkJob();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    checkJob();
  }
});
