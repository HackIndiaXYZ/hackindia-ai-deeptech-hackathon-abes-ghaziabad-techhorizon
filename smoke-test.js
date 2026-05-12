const heuristics = require("./heuristics");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const legit = heuristics.analyzeJob(
  "Google",
  "We are hiring a Senior Software Engineer with 5+ years experience in React and Node.js. Responsibilities include collaborating with product teams, writing clean code, and participating in architecture reviews. Requirements include strong JavaScript knowledge and experience with cloud platforms. Benefits include competitive salary, health insurance, and stock options."
);

const scam = heuristics.analyzeJob(
  "QuickPay Remote",
  "WORK FROM HOME! Earn $5000 daily with no experience. No resume required. Pay registration fee and start immediately. Contact us on WhatsApp only for fast approval."
);

assert(legit.final.score >= 90, `Expected legit sample to be safe, got ${legit.final.score}`);
assert(scam.final.score < 60, `Expected scam sample to be high risk, got ${scam.final.score}`);
assert(scam.flags.flags.length > 0, "Expected scam sample to contain red flags");

console.log("Smoke tests passed");
