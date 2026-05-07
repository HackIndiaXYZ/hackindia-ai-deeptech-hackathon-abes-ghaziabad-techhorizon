/**
 * Job Trust System - Main Server
 * Enhanced with modular architecture and advanced heuristics
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const heuristics = require('./heuristics');
const companyRegistry = require('./companyRegistry');
const CONFIG = require('./config');

const app = express();

// Security middleware
app.use(helmet());
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

app.use(express.json({ limit: '10mb' }));

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

/* -----------------------------
   Enhanced Job Analysis API
----------------------------- */

app.post("/check", validateInput, (req, res) => {
  try {
    const { company, jobText } = req.body;

    // Perform comprehensive analysis
    const analysis = heuristics.analyzeJob(company.trim(), jobText.trim());

    // Format response
    const response = {
      score: analysis.final.score,
      label: analysis.final.label,
      risk: analysis.final.risk,
      companyStatus: analysis.company.status,
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
      }
    };

    // Add email validation if present
    if (analysis.emailValidation) {
      response.details.emailValidation = analysis.emailValidation;
    }

    res.json(response);

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Job Trust System v2.0 running on http://localhost:${PORT}`);
  console.log(`📊 Statistics available at http://localhost:${PORT}/stats`);
  console.log(`💚 Health check at http://localhost:${PORT}/health`);
});