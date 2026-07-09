/**
 * AegisResil Apex — Multi-Channel Message Normalizer
 * Pre-processes raw pasted text from WhatsApp, Telegram, Discord, SMS, and Email
 * before sending to /api/analyze-scam. Strips platform noise, detects channel,
 * and prepends a [SOURCE_CHANNEL: X] annotation for the backend AI prompt.
 */

window.ChannelNormalizer = {

  /**
   * Platform detection pattern signatures.
   * Each entry has a name and a list of regex patterns that identify it.
   */
  PLATFORM_SIGNATURES: {
    WHATSAPP: [
      /\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\]/i, // [12/25/23, 9:41 AM]
      /Messages and calls are end-to-end encrypted/i,
      /\+\d{10,15}\s+added\s+you/i,
      /WhatsApp/i,
      /This message was deleted/i,
    ],
    TELEGRAM: [
      /^Forwarded from\s+.+$/im,
      /\[Telegram\]/i,
      /t\.me\//i,
      /via @\w+/i,
      /\bBot\b.*\bTelegram\b/i,
      /forwarded message/i,
    ],
    DISCORD: [
      /^.+#\d{4}\s+—\s+Today at/im, // Username#1234 — Today at 3:45 PM
      /^\[.+\]\s+\d{1,2}:\d{2}\s*(?:AM|PM)?$/im,
      /discord\.gg\//i,
      /discord\.com\/invite\//i,
      /@everyone|@here/i,
    ],
    SMS: [
      /^(?:From|To):\s*\+?\d[\d\s\-]{8,}/im,
      /STOP\s+to\s+unsubscribe/i,
      /Reply\s+STOP\s+to\s+opt.?out/i,
      /\bSMS\b/i,
      /^\d{5,6}:\s*/im, // Shortcode: message
    ],
    EMAIL: [
      /^From:\s*.+@.+\..+$/im,
      /^Subject:\s*.+$/im,
      /^Date:\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)/im,
      /^To:\s*.+@/im,
      /^Reply-To:/im,
      /^Received:\s+from/im,
      /MIME-Version:/i,
    ],
    LINKEDIN: [
      /linkedin\.com/i,
      /InMail/i,
      /connect with you on LinkedIn/i,
      /LinkedIn Job Alert/i,
    ],
  },

  /**
   * Noise patterns to strip from each platform before sending to AI.
   * These are read receipts, emoji reactions, system messages etc.
   */
  NOISE_PATTERNS: {
    WHATSAPP: [
      /\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\]/g,
      /Messages and calls are end-to-end encrypted\..*/gi,
      /^.+\s+changed the group description$/gim,
      /^.+\s+added\s+.+$/gim,
      /^\u200e/gm, // Left-to-right mark
    ],
    TELEGRAM: [
      /^Forwarded from\s+.+\n/gim,
      /^\[Telegram\]\s*/gim,
      /^via @\w+\s*/gim,
    ],
    DISCORD: [
      /^.+#\d{4}\s+—\s+/gim,
      /\[Today at \d{1,2}:\d{2}\s*(?:AM|PM)?\]/gi,
      /\[Yesterday at \d{1,2}:\d{2}\s*(?:AM|PM)?\]/gi,
      /@everyone|@here/gi,
    ],
    SMS: [
      /^(?:From|To):\s*\+?[\d\s\-]+\n/gim,
      /Reply\s+STOP\s+to\s+opt.?out.*/gi,
      /STOP\s+to\s+unsubscribe.*/gi,
      /^\d{5,6}:\s*/gim,
    ],
    EMAIL: [
      /^(?:From|To|CC|BCC|Date|Subject|Reply-To|Message-ID|MIME-Version|Content-Type|Received|Return-Path|Delivered-To):.+$/gim,
      /^-{3,}.*Forwarded message.*-{3,}$/gim,
      /\n{3,}/g,
    ],
    LINKEDIN: [],
    UNKNOWN: [],
  },

  /**
   * Human-readable labels for detected channels.
   */
  CHANNEL_LABELS: {
    WHATSAPP: 'WhatsApp',
    TELEGRAM: 'Telegram',
    DISCORD: 'Discord',
    SMS: 'SMS / Text Message',
    EMAIL: 'Email',
    LINKEDIN: 'LinkedIn',
    UNKNOWN: 'Unknown / Direct Paste',
  },

  /**
   * Risk multipliers by channel — some channels inherently carry higher scam risk.
   * These are passed as context hints to the AI prompt, not hard-coded scores.
   */
  CHANNEL_RISK_CONTEXT: {
    WHATSAPP: 'HIGH_RISK_CHANNEL — Telegram and WhatsApp are heavily used by international job scammers. Flag any job offers or recruiter contact via this channel with elevated suspicion.',
    TELEGRAM: 'HIGH_RISK_CHANNEL — Telegram bots and channels are a primary vector for remote task scams, crypto job scams, and fake HR contacts. Apply maximum scrutiny.',
    DISCORD: 'MEDIUM_RISK_CHANNEL — Discord is used for community recruiting but also for fake NFT/crypto "job" scams. Evaluate carefully.',
    SMS: 'MEDIUM_RISK_CHANNEL — SMS job offers from unknown numbers or shortcodes should be verified against official company channels.',
    EMAIL: 'STANDARD_CHANNEL — Evaluate email headers and sender domain carefully. Generic addresses (@gmail.com claiming to be from large corporations) are a major red flag.',
    LINKEDIN: 'STANDARD_CHANNEL — LinkedIn is the most legitimate professional recruiting channel, but fake profiles and InMail spam do exist.',
    UNKNOWN: 'STANDARD_CHANNEL — Direct text paste. Evaluate content on its own merits.',
  },

  /**
   * Main processing function.
   * Detects the source channel, strips platform noise, and returns a normalized payload.
   *
   * @param {string} rawText - The raw pasted message text from the user
   * @returns {{ cleanText: string, channel: string, channelLabel: string, annotatedText: string }}
   */
  process(rawText) {
    if (!rawText || rawText.trim() === '') {
      return {
        cleanText: '',
        channel: 'UNKNOWN',
        channelLabel: this.CHANNEL_LABELS.UNKNOWN,
        annotatedText: '',
      };
    }

    // Step 1: Detect channel
    const channel = this._detectChannel(rawText);

    // Step 2: Strip platform-specific noise
    const cleanText = this._stripNoise(rawText, channel);

    // Step 3: Build annotated text for the AI prompt
    const riskContext = this.CHANNEL_RISK_CONTEXT[channel] || this.CHANNEL_RISK_CONTEXT.UNKNOWN;
    const annotatedText = `[SOURCE_CHANNEL: ${this.CHANNEL_LABELS[channel]}]\n[CHANNEL_CONTEXT: ${riskContext}]\n\n${cleanText}`;

    return {
      cleanText,
      channel,
      channelLabel: this.CHANNEL_LABELS[channel],
      annotatedText,
    };
  },

  /**
   * Detects the source platform by scoring pattern matches.
   * Returns the platform with the highest match count.
   * @param {string} text
   * @returns {string} Platform key e.g. 'WHATSAPP'
   */
  _detectChannel(text) {
    const scores = {};

    for (const [platform, patterns] of Object.entries(this.PLATFORM_SIGNATURES)) {
      let score = 0;
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          score++;
        }
      }
      if (score > 0) scores[platform] = score;
    }

    if (Object.keys(scores).length === 0) return 'UNKNOWN';

    // Return platform with highest match score
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  },

  /**
   * Strips platform-specific metadata noise from raw text.
   * @param {string} text
   * @param {string} channel
   * @returns {string} Cleaned message body
   */
  _stripNoise(text, channel) {
    const patterns = this.NOISE_PATTERNS[channel] || this.NOISE_PATTERNS.UNKNOWN;
    let cleaned = text;

    for (const pattern of patterns) {
      cleaned = cleaned.replace(pattern, ' ');
    }

    // Global cleanup: collapse excessive whitespace and blank lines
    cleaned = cleaned
      .replace(/[ \t]{2,}/g, ' ')       // multiple spaces → single
      .replace(/\n{3,}/g, '\n\n')        // 3+ blank lines → double
      .trim();

    return cleaned;
  },
};
