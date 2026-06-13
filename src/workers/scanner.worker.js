const prisma = require("../config/db");
const { runNikto } = require("../scanners/nikto.scanner");
const { translateVulnerabilitiesBatch } = require("../services/llm.service");

async function processPendingScans() {
  let scanId = null;

  try {
    // ==========================================
    // CONCEPT: SELECT ... FOR UPDATE SKIP LOCKED
    // ==========================================
    // Atomic row locking to prevent multiple workers from grabbing the same scan.
    const lockedScans = await prisma.$queryRaw`
      SELECT id FROM "scans"
      WHERE status = 'PENDING'
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
    `;

    if (!lockedScans || lockedScans.length === 0) {
      return; 
    }

    scanId = lockedScans[0].id;
    console.log(`[Worker] Picked up scan: ${scanId}`);

    // Fetch the full scan record (including geminiKey for BYOK)
    const scan = await prisma.scan.findUnique({
      where: { id: scanId }
    });

    // STATUS STATE MACHINE: PENDING -> IN_PROGRESS
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "IN_PROGRESS" }
    });

    console.log(`[Worker] Scan ${scanId} is now IN_PROGRESS. Running ${scan.toolType} against ${scan.url}...`);

    // ==========================================
    // ROUTE TO THE CORRECT SCANNER
    // ==========================================
    let vulnerabilities = [];
    let metadata = null;

    if (scan.toolType === "NIKTO") {
      const result = await runNikto(scan.url);
      vulnerabilities = result.vulnerabilities;
      metadata = result.metadata;
    } else {
      // NMAP and SEMGREP — not yet implemented
      console.log(`[Worker] Tool type ${scan.toolType} is not yet implemented. Skipping scan.`);
      vulnerabilities = [{
        severity: "INFO",
        message: `Scanner for ${scan.toolType} is not yet implemented.`,
        rawData: { toolType: scan.toolType }
      }];
    }

    // ==========================================
    // BYOK: Pass the per-scan Gemini key to the LLM translator
    // ==========================================
    // The geminiKey was stored on the scan row when the user created it.
    // We pass it directly — the LLM service uses it once and discards it.
    vulnerabilities = await translateVulnerabilitiesBatch(vulnerabilities, scan.geminiKey);

    // STATUS STATE MACHINE: IN_PROGRESS -> COMPLETED
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "COMPLETED",
        metadata: metadata,
        geminiKey: null,  // Scrub the key after use — never persist it
        vulnerabilities: {
          create: vulnerabilities
        }
      }
    });

    console.log(`[Worker] Scan ${scanId} COMPLETED! Saved ${vulnerabilities.length} vulnerabilities and metadata.`);

  } catch (error) {
    console.error(`[Worker] Error during scan process:`, error);

    if (scanId) {
      console.log(`[Worker] Marking scan ${scanId} as FAILED due to error.`);
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: "FAILED", geminiKey: null }
      });
    }
  }
}

// ==========================================
// THE POLLING PATTERN
// ==========================================
const POLL_INTERVAL = 5000;

console.log("[Worker] Started. Polling DB for PENDING scans every 5 seconds...");

setInterval(() => {
  processPendingScans();
}, POLL_INTERVAL);

processPendingScans();
