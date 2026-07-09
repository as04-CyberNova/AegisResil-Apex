/**
 * AegisResil Apex — Global Corporate Registry Client
 * Client-side jurisdiction detector and registry URL mapper.
 * Infers legal jurisdiction from domain TLD, company name suffixes,
 * and user-provided hints. Returns structured metadata for the
 * /api/analyze-company backend endpoint.
 */

window.RegistryClient = {

  /**
   * Company name legal suffix → jurisdiction mapping.
   * Used to infer region when no domain is provided.
   */
  NAME_SUFFIXES: {
    // UK
    'ltd': 'UK', 'limited': 'UK', 'plc': 'UK', 'llp': 'UK',
    'lp': 'UK', 'cic': 'UK',
    // Germany / DACH
    'gmbh': 'DE', 'ag': 'DE', 'kg': 'DE', 'ohg': 'DE', 'gbr': 'DE',
    'ug': 'DE', 'ev': 'DE',
    // Netherlands
    'bv': 'NL', 'nv': 'NL', 'vof': 'NL',
    // France
    'sarl': 'FR', 'sa': 'FR', 'sas': 'FR', 'sci': 'FR',
    // India
    'pvt ltd': 'IN', 'pvt. ltd': 'IN', 'private limited': 'IN',
    'llp india': 'IN', 'opc': 'IN',
    // US
    'inc': 'US', 'corp': 'US', 'llc': 'US', 'incorporated': 'US',
  },

  /**
   * Domain TLD → jurisdiction mapping.
   */
  TLD_MAP: {
    '.co.uk': 'UK', '.org.uk': 'UK', '.me.uk': 'UK', '.uk': 'UK',
    '.de': 'DE', '.at': 'AT', '.ch': 'CH',
    '.in': 'IN',
    '.nl': 'NL',
    '.fr': 'FR',
    '.eu': 'EU',
    '.gov': 'US', '.com': 'US', '.us': 'US',
    '.io': 'UNKNOWN', '.co': 'UNKNOWN', '.net': 'UNKNOWN',
  },

  /**
   * Registry metadata per jurisdiction — displayed in the UI trust card.
   */
  REGISTRY_META: {
    UK: {
      name: 'Companies House (UK)',
      url: 'https://find-and-update.company-information.service.gov.uk/',
      apiAvailable: true,
      description: 'Official UK government company register',
      flag: '🇬🇧',
    },
    DE: {
      name: 'Handelsregister (Germany)',
      url: 'https://www.unternehmensregister.de/',
      apiAvailable: false,
      description: 'German commercial register',
      flag: '🇩🇪',
    },
    IN: {
      name: 'MCA21 — Ministry of Corporate Affairs (India)',
      url: 'https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html',
      apiAvailable: true, // via Sandbox.co.in
      description: 'Indian corporate registry via MCA21 V3',
      flag: '🇮🇳',
    },
    NL: {
      name: 'KVK — Kamer van Koophandel (Netherlands)',
      url: 'https://www.kvk.nl/',
      apiAvailable: true,
      description: 'Netherlands Chamber of Commerce register',
      flag: '🇳🇱',
    },
    FR: {
      name: 'INSEE SIRENE (France)',
      url: 'https://annuaire-entreprises.data.gouv.fr/',
      apiAvailable: true,
      description: 'French national business register',
      flag: '🇫🇷',
    },
    EU: {
      name: 'EU e-Justice Portal (BRIS Interconnect)',
      url: 'https://e-justice.europa.eu/489/EN/business_registers__search_for_a_company_in_the_eu',
      apiAvailable: false,
      description: 'EU cross-border registry interconnect (manual portal only)',
      flag: '🇪🇺',
    },
    US: {
      name: 'SEC EDGAR / State Business Registries',
      url: 'https://www.sec.gov/cgi-bin/browse-edgar',
      apiAvailable: true,
      description: 'US SEC public company database',
      flag: '🇺🇸',
    },
    UNKNOWN: {
      name: 'Unknown Jurisdiction',
      url: null,
      apiAvailable: false,
      description: 'Could not determine jurisdiction from available data',
      flag: '🌐',
    },
  },

  /**
   * Main detection function.
   * Analyzes company name and domain URL to infer jurisdiction.
   *
   * @param {string} companyName
   * @param {string} websiteUrl
   * @param {string} [manualOverride] - User-selected jurisdiction code
   * @returns {{ jurisdiction: string, registryName: string, registryUrl: string|null, registryFlag: string, apiAvailable: boolean }}
   */
  detect(companyName, websiteUrl, manualOverride) {
    // Manual override takes precedence
    if (manualOverride && this.REGISTRY_META[manualOverride]) {
      return this._buildResult(manualOverride);
    }

    // Try domain TLD detection first (most reliable)
    if (websiteUrl && websiteUrl.trim() !== '') {
      const jurisdiction = this._detectFromDomain(websiteUrl.trim());
      if (jurisdiction !== 'UNKNOWN') {
        return this._buildResult(jurisdiction);
      }
    }

    // Fall back to company name suffix matching
    if (companyName && companyName.trim() !== '') {
      const jurisdiction = this._detectFromName(companyName.trim());
      if (jurisdiction !== 'UNKNOWN') {
        return this._buildResult(jurisdiction);
      }
    }

    // Default: unknown
    return this._buildResult('UNKNOWN');
  },

  /**
   * Builds the result payload from a jurisdiction code.
   * @param {string} jurisdiction
   * @returns {object}
   */
  _buildResult(jurisdiction) {
    const meta = this.REGISTRY_META[jurisdiction] || this.REGISTRY_META['UNKNOWN'];
    return {
      jurisdiction,
      registryName: meta.name,
      registryUrl: meta.url,
      registryFlag: meta.flag,
      registryDescription: meta.description,
      apiAvailable: meta.apiAvailable,
    };
  },

  /**
   * Detects jurisdiction from domain TLD patterns.
   * @param {string} url
   * @returns {string} Jurisdiction code
   */
  _detectFromDomain(url) {
    try {
      // Normalize URL
      const normalized = url.startsWith('http') ? url : `https://${url}`;
      const hostname = new URL(normalized).hostname.toLowerCase();

      // Check multi-part TLDs first (e.g. .co.uk before .uk)
      for (const [tld, jurisdiction] of Object.entries(this.TLD_MAP)) {
        if (hostname.endsWith(tld)) {
          return jurisdiction;
        }
      }
    } catch (e) {
      // URL parsing failed, fall through to name detection
    }
    return 'UNKNOWN';
  },

  /**
   * Detects jurisdiction from company name legal suffixes.
   * @param {string} name
   * @returns {string} Jurisdiction code
   */
  _detectFromName(name) {
    const lower = name.toLowerCase().replace(/[.,]/g, '');

    // Check multi-word suffixes first (e.g. "pvt ltd")
    const sortedSuffixes = Object.keys(this.NAME_SUFFIXES)
      .sort((a, b) => b.length - a.length); // longest first

    for (const suffix of sortedSuffixes) {
      if (lower.endsWith(suffix) || lower.includes(` ${suffix}`)) {
        return this.NAME_SUFFIXES[suffix];
      }
    }
    return 'UNKNOWN';
  },

  /**
   * Returns all supported jurisdictions for dropdown rendering.
   * @returns {Array<{code: string, label: string, flag: string}>}
   */
  getJurisdictionOptions() {
    return Object.entries(this.REGISTRY_META)
      .filter(([code]) => code !== 'UNKNOWN')
      .map(([code, meta]) => ({
        code,
        label: `${meta.flag} ${meta.name}`,
        shortLabel: `${meta.flag} ${code}`,
        flag: meta.flag,
        apiAvailable: meta.apiAvailable,
      }));
  },
};
