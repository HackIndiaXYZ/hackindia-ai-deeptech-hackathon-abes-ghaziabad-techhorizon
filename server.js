/**
 * Job Trust System - Main Server
 * Enhanced with modular architecture and advanced heuristics
 */

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const Tesseract = require("tesseract.js");

const heuristics = require('./heuristics');
const companyRegistry = require('./companyRegistry');
const CONFIG = require('./config');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only PDF, PNG, JPG, and WEBP files are supported'));
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", "data:", "blob:"]
    }
  }
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['yourdomain.com'] : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/check', limiter);
app.use('/analyze-poster', limiter);

app.use(express.json({ limit: '10mb' }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON payload',
      message: 'Request body must be valid JSON'
    });
  }
  next(err);
});
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Input validation middleware
const validateInput = (req, res, next) => {
  const { company, jobText } = req.body;

  if (!company || typeof company !== 'string' || company.trim().length === 0) {
    return res.status(400).json({
      error: 'Company name is required and must be a non-empty string'
    });
  }

  if (!jobText || typeof jobText !== 'string' || jobText.trim().length === 0) {
    return res.status(400).json({
      error: 'Job description is required and must be a non-empty string'
    });
  }

  if (company.length > 100 || jobText.length > CONFIG.TEXT_LIMITS.MAX_DESCRIPTION_LENGTH) {
    return res.status(400).json({
      error: 'Input exceeds maximum allowed length'
    });
  }

  next();
};

function formatAnalysisResponse(analysis, extras = {}) {
  const response = {
    score: analysis.final.score,
    label: analysis.final.label,
    risk: analysis.final.risk,
    companyStatus: analysis.company.status,
    companyName: analysis.final.companyName,
    industry: analysis.final.industry,
    redFlagsFound: analysis.flags.flags.length,
    contactsDetected: analysis.final.contacts,
    details: {
      companyVerification: {
        status: analysis.company.status,
        reason: analysis.company.reason
      },
      textQuality: {
        score: analysis.text.score,
        issues: analysis.text.quality.issues.length + analysis.text.grammar.errors.length
      },
      redFlags: analysis.flags.flags.slice(0, 5), // Top 5 flags
      professionalScore: analysis.text.professionalism.professionalWords
    },
    ...extras
  };

  if (analysis.emailValidation) {
    response.details.emailValidation = analysis.emailValidation;
  }

  return response;
}

function normalizeExtractedText(text) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractCompanyName(text) {
  const normalized = normalizeExtractedText(text);
  const lines = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const labeledPatterns = [
    /(?:company|organization|employer|hiring company)\s*[:\-]\s*([A-Za-z0-9&.,' -]{2,80})/i,
    /(?:join|hiring at|careers at)\s+([A-Z][A-Za-z0-9&.,' -]{2,80})/i,
    /([A-Z][A-Za-z0-9&.,' -]{2,80})\s+(?:is hiring|hiring now|careers)/i
  ];

  for (const pattern of labeledPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return cleanCompanyCandidate(match[1]);
    }
  }

  for (const line of lines.slice(0, 8)) {
    const candidate = cleanCompanyCandidate(line);
    if (candidate && companyRegistry.getCompanyInfo(candidate)) {
      return candidate;
    }
  }

  const firstUsableLine = lines.find(line => {
    const lower = line.toLowerCase();
    return line.length >= 2 &&
      line.length <= 70 &&
      !lower.includes('job') &&
      !lower.includes('salary') &&
      !lower.includes('work from') &&
      !lower.includes('apply') &&
      !lower.includes('urgent') &&
      !/^\d/.test(line);
  });

  return cleanCompanyCandidate(firstUsableLine || 'Unknown Company');
}

function cleanCompanyCandidate(value) {
  if (!value) return '';
  return value
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[|()[\]{}]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[.,:;\- ]+$/g, '')
    .trim()
    .slice(0, 100);
}

async function extractTextFromUpload(file) {
  if (file.mimetype === 'application/pdf') {
    const parser = new PDFParse({ data: file.buffer });
    const result = await parser.getText();
    return normalizeExtractedText(result.text || '');
  }

  if (file.mimetype.startsWith('image/')) {
    const result = await Tesseract.recognize(file.buffer, 'eng');
    return normalizeExtractedText(result.data?.text || '');
  }

  throw new Error('Unsupported file type');
}

/* -----------------------------
   Enhanced Job Analysis API
----------------------------- */

app.post("/check", validateInput, (req, res) => {
  try {
    const { company, jobText } = req.body;

    // Perform comprehensive analysis
    const analysis = heuristics.analyzeJob(company.trim(), jobText.trim());

    res.json(formatAnalysisResponse(analysis));

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Internal server error during analysis',
      score: 0,
      label: 'Error',
      risk: 'unknown'
    });
  }
});

app.post("/analyze-poster", upload.single('poster'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Upload a PDF or image poster first' });
    }

    const extractedText = await extractTextFromUpload(req.file);
    if (extractedText.length < CONFIG.TEXT_LIMITS.MIN_DESCRIPTION_LENGTH) {
      return res.status(422).json({
        error: 'Not enough readable text found in this poster',
        extractedText,
        message: 'Use a clearer image, a text-based PDF, or paste the job text manually.'
      });
    }

    const companyName = extractCompanyName(extractedText);
    const analysis = heuristics.analyzeJob(companyName, extractedText);

    res.json(formatAnalysisResponse(analysis, {
      source: {
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        extractedCharacters: extractedText.length
      },
      extracted: {
        companyName,
        textPreview: extractedText.slice(0, 700)
      }
    }));

  } catch (error) {
    console.error('Poster analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze poster',
      message: error.message
    });
  }
});

/* -----------------------------
   Statistics API (for monitoring)
----------------------------- */

app.get("/stats", (req, res) => {
  try {
    const stats = heuristics.getStatistics();

    if (!stats) {
      return res.json({
        totalAnalyses: 0,
        message: 'No analysis data available yet'
      });
    }

    res.json({
      totalAnalyses: stats.total,
      averageScore: stats.averageScore,
      riskDistribution: stats.riskDistribution,
      industryDistribution: stats.industryDistribution,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

/* -----------------------------
   Health Check
----------------------------- */

app.get("/health", (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

/* -----------------------------
   Error Handling
----------------------------- */

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err instanceof multer.MulterError || err.message?.includes('Only PDF')) {
    return res.status(400).json({
      error: err.message
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

/* -----------------------------
   Start Server
----------------------------- */

const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_ATTEMPTS = 10;
const server = require('http').createServer(app);

function startServer(port) {
  server.listen(port, () => {
    console.log(`Job Trust System v2.0 running on http://localhost:${port}`);
    console.log(`Statistics available at http://localhost:${port}/stats`);
    console.log(`Health check at http://localhost:${port}/health`);
  });
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    const busyPort = Number(error.port) || DEFAULT_PORT;
    const nextPort = busyPort + 1;
    const attemptsUsed = busyPort - DEFAULT_PORT + 1;

    if (attemptsUsed < MAX_PORT_ATTEMPTS) {
      console.warn(`Port ${busyPort} is already in use. Trying http://localhost:${nextPort} instead.`);
      startServer(nextPort);
      return;
    }

    console.error(`Ports ${DEFAULT_PORT}-${DEFAULT_PORT + MAX_PORT_ATTEMPTS - 1} are already in use.`);
    console.error('Stop one of those processes or set a different PORT environment variable.');
    process.exit(1);
  }
  console.error('Server error:', error);
  process.exit(1);
});

startServer(DEFAULT_PORT);
