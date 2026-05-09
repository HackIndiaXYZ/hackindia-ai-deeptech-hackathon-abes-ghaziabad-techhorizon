/**
 * Job Trust System - Text Analysis Utilities
 * Handles text quality, grammar, and content analysis
 */

const CONFIG = require('./config');

class TextAnalyzer {
  constructor() {
    // Common misspellings and grammar issues
    this.spellingErrors = [
      'teh', 'recieve', 'seperate', 'occured', 'comparision',
      'buisness', 'wich', 'thier', 'writting', 'commited'
    ];

    // Professional job description keywords
    this.professionalKeywords = [
      'responsibilities', 'requirements', 'qualifications', 'benefits',
      'experience', 'skills', 'education', 'salary', 'compensation',
      'team', 'project', 'development', 'analysis', 'management'
    ];

    // Scam-specific phrases
    this.scamPhrases = [
      'no experience required', 'immediate start', 'work from anywhere',
      'earn thousands', 'guaranteed income', 'confidential project'
    ];
  }

  /**
   * Analyze text quality and structure
   */
  analyzeQuality(text) {
    let score = 0;
    const issues = [];

    // Length checks
    if (text.length < CONFIG.TEXT_LIMITS.MIN_DESCRIPTION_LENGTH) {
      score -= 20;
      issues.push('Description too short');
    } else if (text.length > CONFIG.TEXT_LIMITS.MAX_DESCRIPTION_LENGTH) {
      score -= 5;
      issues.push('Description unusually long');
    }

    // Sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < CONFIG.QUALITY_CHECKS.MIN_SENTENCES) {
      score -= 10;
      issues.push('Too few sentences');
    }

    // Exclamation marks (scams often overuse them)
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > CONFIG.QUALITY_CHECKS.MAX_EXCLAMATION_MARKS) {
      score -= 5;
      issues.push('Excessive exclamation marks');
    }

    // Check for required job elements
    const lowerText = text.toLowerCase();
    let foundElements = 0;
    CONFIG.QUALITY_CHECKS.REQUIRED_ELEMENTS.forEach(element => {
      if (lowerText.includes(element)) foundElements++;
    });

    if (foundElements === 0) {
      score -= 15;
      issues.push('Missing job description elements');
    } else if (foundElements >= 2) {
      score += 10; // Bonus for structured descriptions
    }

    // Check for suspicious words
    CONFIG.QUALITY_CHECKS.SUSPICIOUS_WORDS.forEach(word => {
      if (lowerText.includes(word)) {
        score -= 2;
        issues.push(`Suspicious word: ${word}`);
      }
    });

    return { score, issues };
  }

  /**
   * Basic grammar and spelling check
   */
  checkGrammar(text) {
    let score = 0;
    const errors = [];

    const lowerText = text.toLowerCase();

    // Check for common spelling errors
    this.spellingErrors.forEach(error => {
      if (lowerText.includes(error)) {
        score -= 3;
        errors.push(`Possible spelling error: ${error}`);
      }
    });

    // Check for all caps words (scams often shout)
    const words = text.split(/\s+/);
    const capsWords = words.filter(word => word === word.toUpperCase() && word.length > 3);
    if (capsWords.length > 2) {
      score -= 5;
      errors.push('Excessive use of capital letters');
    }

    // Check for repeated words
    const repeatedWords = this.findRepeatedWords(text);
    if (repeatedWords.length > 0) {
      score -= 2;
      errors.push(`Repeated words: ${repeatedWords.join(', ')}`);
    }

    return { score, errors };
  }

  /**
   * Find repeated words (potential spam)
   */
  findRepeatedWords(text) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordCount = {};

    words.forEach(word => {
      if (word.length > 3) { // Only check meaningful words
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    return Object.keys(wordCount).filter(word => wordCount[word] > 2);
  }

  /**
   * Extract contact information
   */
  extractContacts(text) {
    const contacts = {
      emails: [],
      phones: [],
      urls: []
    };

    // Email regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    contacts.emails = text.match(emailRegex) || [];

    // Phone regex (basic)
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    contacts.phones = text.match(phoneRegex) || [];

    // URL regex
    const urlRegex = /https?:\/\/[^\s]+/g;
    contacts.urls = text.match(urlRegex) || [];

    return contacts;
  }

  /**
   * Analyze professionalism
   */
  analyzeProfessionalism(text) {
    let score = 0;
    const lowerText = text.toLowerCase();

    // Count professional keywords
    let professionalCount = 0;
    this.professionalKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) professionalCount++;
    });

    // Bonus for professional content
    score += Math.min(professionalCount * 2, 20);

    // Check for scam phrases
    this.scamPhrases.forEach(phrase => {
      if (lowerText.includes(phrase)) {
        score -= 5;
      }
    });

    return { score, professionalWords: professionalCount };
  }

  /**
   * Comprehensive text analysis
   */
  analyze(text) {
    const quality = this.analyzeQuality(text);
    const grammar = this.checkGrammar(text);
    const contacts = this.extractContacts(text);
    const professionalism = this.analyzeProfessionalism(text);

    const totalScore = quality.score + grammar.score + professionalism.score;

    return {
      score: totalScore,
      quality,
      grammar,
      contacts,
      professionalism,
      summary: {
        totalIssues: quality.issues.length + grammar.errors.length,
        hasContacts: contacts.emails.length > 0 || contacts.phones.length > 0,
        professionalScore: professionalism.professionalWords
      }
    };
  }
}

module.exports = new TextAnalyzer();