# Job Trust System v2.0

Rule-based job scam detection using weighted red flags, company verification, text quality checks, and contact analysis.

The app supports two analysis modes:

- Paste company and job description text manually.
- Upload a job poster as a PDF, PNG, JPG, or WEBP. The server extracts readable text, detects a likely company name, and runs the same scam analysis.

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

Do not open `index.html` directly from the file system. The frontend calls the backend API at `/check`, so it needs the Express server.

## Scripts

```bash
npm start
npm run dev
npm test
```

- `npm start` runs the Express server.
- `npm run dev` runs the server with Nodemon.
- `npm test` checks JavaScript syntax and runs smoke tests for safe and scam samples.

## API

### `POST /check`

Request:

```json
{
  "company": "Google",
  "jobText": "We are hiring a Senior Software Engineer..."
}
```

Response:

```json
{
  "score": 100,
  "label": "Safe",
  "risk": "low",
  "companyStatus": "verified",
  "industry": "general",
  "redFlagsFound": 0
}
```

### `GET /health`

Returns server health and version.

### `GET /stats`

Returns analysis statistics for the current server process.

### `POST /analyze-poster`

Upload a poster file using multipart form data with the field name `poster`.

Supported files:

- PDF
- PNG
- JPG
- WEBP

The response includes the trust score, detected company name, red flags, contacts, and an extracted text preview.

## Project Structure

```text
config.js           Configuration and scoring constants
companyRegistry.js  Company verification and email domain checks
heuristics.js       Main analysis engine
textAnalysis.js     Text quality and contact extraction
server.js           Express API and static file server
index.html          Frontend markup
styles.css          Frontend styles
app.js              Frontend behavior
smoke-test.js       Basic project verification
```

## Poster Analysis Notes

PDFs work best when they contain selectable text. Image posters use OCR, so accuracy depends on image quality. Use clear, upright English text for the best results.

## Scoring

The analyzer starts at 100 and adjusts the score using:

- Company verification
- Text quality and professionalism
- Weighted scam red flags
- Email domain validation

Risk levels:

- `80-100`: Safe
- `60-79`: Suspicious
- `0-59`: Likely Scam

## Important Note

This is an automated helper, not a guarantee. Always verify company websites, recruiter emails, payment requests, and interview process details before acting on a job offer.
