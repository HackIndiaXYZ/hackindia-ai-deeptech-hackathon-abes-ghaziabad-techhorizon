/**
 * Job Trust System - Company Registry
 * Handles company verification and domain validation
 */

const CONFIG = require('./config');

class CompanyRegistry {
  constructor() {
    // Verified companies database (in production, this would be a real database)
    this.verifiedCompanies = new Map([
      ['google', { status: 'verified', domain: 'google.com', industry: 'tech' }],
      ['microsoft', { status: 'verified', domain: 'microsoft.com', industry: 'tech' }],
      ['tcs', { status: 'verified', domain: 'tcs.com', industry: 'consulting' }],
      ['infosys', { status: 'verified', domain: 'infosys.com', industry: 'consulting' }],
      ['amazon', { status: 'verified', domain: 'amazon.com', industry: 'retail' }],
      ['abes', { status: 'verified', domain: 'abes.ac.in', industry: 'education' }]
    ]);

    // Suspicious company patterns
    this.suspiciousPatterns = [
      /;/, /,/, /\d{4,}/, // Special chars, long numbers
      /scam/i, /fraud/i, /fake/i // Explicit scam words
    ];
  }

  /**
   * Verify company legitimacy
   */
  verifyCompany(companyName) {
    if (!companyName || companyName.length < CONFIG.TEXT_LIMITS.MIN_COMPANY_NAME_LENGTH) {
      return { status: 'invalid', score: -30, reason: 'Company name too short' };
    }

    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(companyName)) {
        return { status: 'suspicious', score: -20, reason: 'Suspicious company name pattern' };
      }
    }

    // Check verified companies
    const normalizedName = companyName.toLowerCase().trim();
    if (this.verifiedCompanies.has(normalizedName)) {
      const company = this.verifiedCompanies.get(normalizedName);
      return {
        status: 'verified',
        score: 20,
        reason: 'Verified company',
        domain: company.domain,
        industry: company.industry
      };
    }

    // Unknown company - neutral score
    return { status: 'unknown', score: 0, reason: 'Company not in registry' };
  }

  /**
   * Validate email domain
   */
  validateEmailDomain(email) {
    if (!email) return { valid: false, score: 0 };

    try {
      const domain = email.toLowerCase().split('@')[1];
      if (!domain) return { valid: false, score: -10 };

      // Check if it's a free email provider (suspicious for business)
      const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      if (freeProviders.includes(domain)) {
        return { valid: false, score: -15, reason: 'Free email provider' };
      }

      // Check for suspicious domains
      if (domain.includes('gmail') || domain.includes('yahoo') || domain.includes('hotmail')) {
        return { valid: false, score: -10, reason: 'Personal email domain' };
      }

      // Check for business-like domains
      const businessPatterns = ['.com', '.org', '.net', '.co', '.io'];
      const hasBusinessPattern = businessPatterns.some(pattern =>
        domain.endsWith(pattern)
      );

      if (hasBusinessPattern) {
        return { valid: true, score: 5, reason: 'Business domain' };
      }

      return { valid: true, score: 0, reason: 'Unknown domain type' };
    } catch (error) {
      return { valid: false, score: -5, reason: 'Invalid email format' };
    }
  }

  /**
   * Add company to registry (admin function)
   */
  addCompany(name, domain, industry = 'unknown') {
    this.verifiedCompanies.set(name.toLowerCase(), {
      status: 'verified',
      domain: domain.toLowerCase(),
      industry
    });
  }

  /**
   * Get company info
   */
  getCompanyInfo(name) {
    return this.verifiedCompanies.get(name.toLowerCase());
  }
}

module.exports = new CompanyRegistry();