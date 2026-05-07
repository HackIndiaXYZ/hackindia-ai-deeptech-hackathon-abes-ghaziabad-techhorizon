/**
 * Job Trust System - Configuration
 * Contains all configurable parameters and constants
 */

const CONFIG = {
  // Scoring thresholds
  SCORE_THRESHOLDS: {
    SAFE: 80,
    SUSPICIOUS: 60,
    LIKELY_SCAM: 40
  },

  // Text analysis limits
  TEXT_LIMITS: {
    MIN_DESCRIPTION_LENGTH: 50,
    MAX_DESCRIPTION_LENGTH: 5000,
    MIN_COMPANY_NAME_LENGTH: 2
  },

  // Weighted red flags with severity scores
  RED_FLAGS: {
    // Critical flags (high penalty)
    CRITICAL: {
      'registration fee': 25,
      'training fee': 25,
      'investment required': 25,
      'fake check': 25,
      'equipment reimbursement': 20,
      'reshipper': 20,
      'payment processing': 20,
      'finance agent': 20
    },

    // High severity flags
    HIGH: {
      'immediate': 15,
      'urgent': 15,
      'guaranteed': 15,
      'easy money': 15,
      'instant payment': 15,
      'confidential client': 15,
      'task job': 15
    },

    // Medium severity flags
    MEDIUM: {
      'no experience': 10,
      'entry level': 10,
      'earn': 8,
      'daily income': 8,
      'quick money': 8,
      'be your own boss': 8,
      'mobile work': 8
    },

    // Low severity flags (context-dependent)
    LOW: {
      'work from home': 3,
      'remote': 3,
      'data entry': 5,
      'typing': 5,
      'pdf': 4,
      'excel': 4,
      'form filling': 4
    },

    // Communication method flags
    COMMUNICATION: {
      'telegram': 12,
      'whatsapp': 12,
      'signal': 12,
      'personal email': 8,
      'gmail.com': 6,
      'yahoo.com': 6,
      'hotmail.com': 6
    }
  },

  // Industry-specific exceptions
  INDUSTRY_EXCEPTIONS: {
    CRYPTO: ['quick money', 'daily income', 'earn', 'investment'],
    FREELANCE: ['be your own boss', 'remote', 'work from home'],
    STARTUP: ['no experience', 'entry level', 'immediate']
  },

  // Grammar and quality checks
  QUALITY_CHECKS: {
    MIN_SENTENCES: 3,
    MAX_EXCLAMATION_MARKS: 3,
    SUSPICIOUS_WORDS: ['amazing', 'fantastic', 'unbelievable', 'shocking'],
    REQUIRED_ELEMENTS: ['responsibilities', 'requirements', 'benefits']
  },

  // Email domain validation
  EMAIL_DOMAINS: {
    FREE_PROVIDERS: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'],
    BUSINESS_PATTERNS: ['.com', '.org', '.net', '.co', '.io']
  }
};

module.exports = CONFIG;