const prisma = require("../config/db");

// A helper function to create fake delays (simulating a security scan taking time)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processPendingScans() {
  let scanId = null;

  try {
    // ==========================================
    // CONCEPT: SELECT ... FOR UPDATE SKIP LOCKED
    // ==========================================
    // We use a raw SQL query here instead of Prisma's standard API.
    // Why? If we run multiple worker processes, they might try to fetch the exact
    // same PENDING scan at the exact same millisecond. 
    // "FOR UPDATE" locks the row so others can't touch it.
    // "SKIP LOCKED" says "if another worker locked it, just skip it and grab the next available one".
    const lockedScans = await prisma.$queryRaw`
      SELECT id FROM "scans"
      WHERE status = 'PENDING'
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
    `;

    // If there are no pending scans, the array will be empty. We just return.
    if (!lockedScans || lockedScans.length === 0) {
      return; 
    }

    scanId = lockedScans[0].id;
    console.log(`[Worker] Picked up scan: ${scanId}`);

    // ==========================================
    // CONCEPT: STATUS STATE MACHINE (PENDING -> IN_PROGRESS)
    // ==========================================
    // We immediately change the state so that the frontend knows the scan started.
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "IN_PROGRESS" }
    });

    console.log(`[Worker] Scan ${scanId} is now IN_PROGRESS. Simulating scanning tool...`);

    // ==== SIMULATE THE HEAVY LIFTING (Dummy Data) ====
    // In a real scenario, here is where you would do:
    // await exec("python3 scanner.py ...") or execute Semgrep/Nikto
    await sleep(5000); // 5 seconds of "fake scanning"

    // Mock results from the "tool"
    const fakeVulnerabilities = [
      {
        severity: "HIGH",
        message: "SQL Injection found in url parameter",
        rawData: { parameter: "id", type: "SQLi" }
      },
      {
        severity: "LOW",
        message: "Missing Strict-Transport-Security header",
        rawData: { header: "Strict-Transport-Security" }
      }
    ];

    // ==========================================
    // CONCEPT: STATUS STATE MACHINE (IN_PROGRESS -> COMPLETED)
    // ==========================================
    // The work is done! We save the results and mark it complete.
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "COMPLETED",
        // Prisma allows nested creates! This inserts into the Vulnerability table automatically.
        vulnerabilities: {
          create: fakeVulnerabilities
        }
      }
    });

    console.log(`[Worker] Scan ${scanId} COMPLETED! Saved ${fakeVulnerabilities.length} vulnerabilities.`);

  } catch (error) {
    console.error(`[Worker] Error during scan process:`, error);

    // ==========================================
    // CONCEPT: STATUS STATE MACHINE (IN_PROGRESS -> FAILED)
    // ==========================================
    if (scanId) {
      console.log(`[Worker] Marking scan ${scanId} as FAILED due to error.`);
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: "FAILED" }
      });
    }
  }
}

// ==========================================
// CONCEPT: THE POLLING PATTERN
// ==========================================
const POLL_INTERVAL = 5000; // 5 seconds

console.log("[Worker] Started. Polling DB for PENDING scans every 5 seconds...");

// setInterval acts like a heartbeat. Every 5 seconds, it wakes up and asks:
// "Is there any PENDING work?"
setInterval(() => {
  processPendingScans();
}, POLL_INTERVAL);

// We immediately do one check on startup so we don't wait 5 seconds for the first run
processPendingScans();
