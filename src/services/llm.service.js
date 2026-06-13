/**
 * LLM Service — The "Translator" Layer
 * Translates raw vulnerability findings into human-readable advice via Gemini.
 * 
 * BYOK Architecture: Accepts an API key per-call. No global key storage.
 * Falls back to process.env.GEMINI_API_KEY if no per-request key is provided.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Calls the Gemini API with automatic retry on rate-limit (429) errors.
 * Uses exponential backoff: 2s → 4s → 8s between retries.
 */
async function callWithRetry(model, prompt, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error;
      const isRateLimit =
        error.message?.includes('429') ||
        error.message?.includes('RESOURCE_EXHAUSTED') ||
        error.status === 429;

      if (isRateLimit && attempt < maxRetries - 1) {
        const waitMs = Math.pow(2, attempt + 1) * 2000;
        console.log(`[LLM Service] Rate limit hit. Retrying in ${waitMs / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Takes an array of raw vulnerabilities and returns them with `translatedText` added.
 * 
 * @param {Array} vulnerabilities - [{ severity, message, rawData }]
 * @param {string|null} apiKey - BYOK Gemini API key (per-scan, from frontend)
 * @returns {Array} The same array, with `translatedText` populated if successful.
 */
async function translateVulnerabilitiesBatch(vulnerabilities, apiKey = null) {
  // Resolve the key: per-request BYOK key > env var > none
  const resolvedKey = apiKey || process.env.GEMINI_API_KEY;

  if (!resolvedKey || !vulnerabilities || vulnerabilities.length === 0) {
    console.log("[LLM Service] No Gemini API key available (or empty scan). Skipping translation.");
    return vulnerabilities;
  }

  console.log(`[LLM Service] Batch translating ${vulnerabilities.length} vulnerabilities via Gemini...`);

  try {
    // Create a fresh client with the resolved key (supports BYOK per-scan)
    const genAI = new GoogleGenerativeAI(resolvedKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const payloadForLLM = vulnerabilities.map((vuln, index) => ({
      id: index,
      severity: vuln.severity,
      message: vuln.message
    }));

    const prompt = `
    Act as a Senior Web Security Engineer. I am going to give you a JSON array of raw vulnerability findings from a scanner (like Nikto).
    For each finding, I need you to provide a brief, plain-English explanation that a non-technical startup founder can understand.
    Explain what the vulnerability means, why it matters, and a high-level suggestion on how to fix it. Keep it under 3 sentences per finding.

    Here are the findings:
    ${JSON.stringify(payloadForLLM, null, 2)}

    CRITICAL INSTRUCTION: You must respond ONLY with a valid JSON array of objects. Do not include markdown formatting like \`\`\`json. 
    Each object must have exactly two keys:
    - "id": The exact integer id I provided for the finding.
    - "translatedText": Your plain English explanation.
    
    Example output format:
    [
      { "id": 0, "translatedText": "Your server is missing a security header..." }
    ]
    `;

    let responseText = await callWithRetry(model, prompt);

    // Clean up potential markdown
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    const translatedArray = JSON.parse(responseText);

    const enrichedVulnerabilities = vulnerabilities.map((vuln, index) => {
      const translationObject = translatedArray.find(t => t.id === index);
      return {
        ...vuln,
        translatedText: translationObject ? translationObject.translatedText : null
      };
    });

    console.log("[LLM Service] Batch translation successful!");
    return enrichedVulnerabilities;

  } catch (error) {
    console.error("[LLM Service] Translation failed, returning raw data. Error:", error.message);
    return vulnerabilities;
  }
}

module.exports = {
  translateVulnerabilitiesBatch
};
