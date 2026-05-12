/**
 * Job Trust System - Enhanced Heuristics Engine
 * Advanced pattern detection with context awareness and learning
 */

const CONFIG = require('./config');
const textAnalyzer = require('./textAnalysis');
const companyRegistry = require('./companyRegistry');

class HeuristicsEngine {
  constructor() {
    this.analysisHistory = []; // For learning and adaptation
    this.contextRules = this.buildContextRules();
  }

  /**
   * Build context-aware rules
   */
  buildContextRules() {
    return {
      // Industry-specific exceptions
      crypto: {
        allowed: CONFIG.INDUSTRY_EXCEPTIONS.CRYPTO,
        multiplier: 0.5 // Reduce penalty for these words in crypto context
      },
      freelance: {
        allowed: CONFIG.INDUSTRY_EXCEPTIONS.FREELANCE,
        multiplier: 0.3
      },
      startup: {
        allowed: CONFIG.INDUSTRY_EXCEPTIONS.STARTUP,
        multiplier: 0.4
      },

      // Combination rules (multiple flags = higher penalty)
      combinations: {
        'registration fee + investment required': 1.5,
        'urgent + immediate': 1.3,
        'guaranteed + easy money': 1.4,
        'work from home + no experience': 1.2
      }
    };
  }

  /**
   * Detect industry context from job description
   */
  detectIndustry(text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('crypto') || lowerText.includes('blockchain') ||
        lowerText.includes('bitcoin') || lowerText.includes('ethereum')) {
      return 'crypto';
    }

    if (lowerText.includes('freelance') || lowerText.includes('independent') ||
        lowerText.includes('contract')) {
      return 'freelance';
    }

    if (lowerText.includes('startup') || lowerText.includes('early stage')) {
      return 'startup';
    }

    return 'general';
  }

  /**
   * Calculate weighted red flag score with context
   */
  calculateRedFlagScore(text, industry) {
    let totalScore = 0;
    const foundFlags = [];
    const lowerText = text.toLowerCase();

    // Normalize text for better matching
    const normalizedText = lowerText.replace(/[^a-z0-9 ]/g, ' ');

    // Check all flag categories
    Object.keys(CONFIG.RED_FLAGS).forEach(category => {
      const flags = CONFIG.RED_FLAGS[category];

      Object.keys(flags).forEach(flag => {
        if (normalizedText.includes(flag)) {
          let penalty = flags[flag];

          // Apply industry context multiplier
          if (industry !== 'general' && this.contextRules[industry]?.allowed.includes(flag)) {
            penalty *= this.contextRules[industry].multiplier;
          }

          totalScore -= penalty;
          foundFlags.push({ flag, category, penalty: penalty });
        }
      });
    });

    // Check for combination penalties
    const combinationMultiplier = this.checkCombinations(foundFlags.map(f => f.flag));
    if (combinationMultiplier > 1) {
      totalScore *= combinationMultiplier;
    }

    return { score: Math.max(totalScore, -50), flags: foundFlags };
  }

  /**
   * Check for dangerous flag combinations
   */
  checkCombinations(foundFlags) {
    let multiplier = 1.0;

    Object.keys(this.contextRules.combinations).forEach(combination => {
      const flags = combination.split(' + ');
      const foundCount = flags.filter(flag =>
        foundFlags.some(foundFlag => foundFlag.includes(flag))
      ).length;

      if (foundCount === flags.length) {
        multiplier = Math.max(multiplier, this.contextRules.combinations[combination]);
      }
    });

    return multiplier;
  }

  /**
   * Analyze job posting comprehensively
   */
  analyzeJob(companyName, jobText) {
    // Start below "safe" so legitimate signals can raise the score and
    // different good postings do not all clamp to the same 100 result.
    let totalScore = CONFIG.BASE_SCORE;
    const analysis = {
      company: {},
      text: {},
      flags: {},
      final: {}
    };

    // 1. Company verification
    analysis.company = companyRegistry.verifyCompany(companyName);
    totalScore += analysis.company.score;

    // 2. Text analysis
    analysis.text = textAnalyzer.analyze(jobText);
    totalScore += analysis.text.score;

    // 3. Industry detection and red flags
    const industry = this.detectIndustry(jobText);
    analysis.flags = this.calculateRedFlagScore(jobText, industry);
    totalScore += analysis.flags.score;

    // 4. Email domain validation (if email found)
    const contacts = textAnalyzer.extractContacts(jobText);
    if (contacts.emails.length > 0) {
      const emailValidation = companyRegistry.validateEmailDomain(contacts.emails[0]);
      totalScore += emailValidation.score;
      analysis.emailValidation = emailValidation;
    }

    // 5. Apply final adjustments
    totalScore = Math.max(0, Math.min(100, totalScore));

    // 6. Determine label
    let label = 'Safe';
    let risk = 'low';

    if (totalScore < CONFIG.SCORE_THRESHOLDS.SAFE) {
      label = 'Suspicious';
      risk = 'medium';
    }
    if (totalScore < CONFIG.SCORE_THRESHOLDS.LIKELY_SCAM) {
      label = 'Likely Scam';
      risk = 'high';
    }

    analysis.final = {
      score: Math.round(totalScore),
      label,
      risk,
      industry,
      contacts: contacts
    };

    // Store for learning (optional)
    this.storeAnalysis(analysis);

    return analysis;
  }

  /**
   * Store analysis for potential learning
   */
  storeAnalysis(analysis) {
    this.analysisHistory.push({
      timestamp: new Date(),
      score: analysis.final.score,
      risk: analysis.final.risk,
      industry: analysis.final.industry,
      flagCount: analysis.flags.flags.length
    });

    // Keep only last 1000 analyses
    if (this.analysisHistory.length > 1000) {
      this.analysisHistory.shift();
    }
  }

  /**
   * Get analysis statistics for learning
   */
  getStatistics() {
    if (this.analysisHistory.length === 0) return null;

    const stats = {
      total: this.analysisHistory.length,
      averageScore: 0,
      riskDistribution: { low: 0, medium: 0, high: 0 },
      industryDistribution: {}
    };

    this.analysisHistory.forEach(item => {
      stats.averageScore += item.score;
      stats.riskDistribution[item.risk]++;
      stats.industryDistribution[item.industry] = (stats.industryDistribution[item.industry] || 0) + 1;
    });

    stats.averageScore = Math.round(stats.averageScore / stats.total);

    return stats;
  }

  /**
   * Adaptive learning - adjust weights based on history
   */
  adaptWeights() {
    const stats = this.getStatistics();
    if (!stats) return;

    // If too many false positives, reduce penalties for common flags
    if (stats.averageScore < 60) {
      console.log('Adapting: Reducing penalties due to low average scores');
      // Could implement weight adjustment logic here
    }
  }
}

module.exports = new HeuristicsEngine();
