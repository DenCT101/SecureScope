// wraps the nikto execution
// spawn process
// capture output
// parse output
// return output

const { exec } = require("child_process");

/**
 * Runs a Nikto scan against a target URL.
 * Wrapped in a Promise so our background worker can simple `await runNikto(url)`
 */
async function runNikto(targetUrl) {
    return new Promise((resolve, reject) => {

        // ==========================================
        // 1. THE COMMAND STRING (Using Docker)
        // ==========================================
        // Nikto is written in Perl. Instead of installing Perl on Windows,
        // we use Docker to spin up a tiny Linux container that already has
        // Perl + Nikto pre-installed inside it.
        //
        // docker run  → "Create a container and run it"
        // --rm        → "Delete the container after it finishes" (cleanup, no junk left behind)
        // frapsoft/nikto → "Use this pre-built image from Docker Hub as the blueprint"
        // -h <url>    → This flag gets passed directly to Nikto inside the container
        // -maxtime 60 → Stop scanning after 60 seconds (Nikto requires this to be pure seconds, not '1m')
        // (Removed useragent spoofing because this specific Nikto version 2.1.5 does not support it)
        const command = `docker run --rm frapsoft/nikto -h ${targetUrl} -maxtime 180`;

        console.log(`[Nikto Scanner] Spawning terminal to run: ${command}`);

        // ==========================================
        // 2. SPAWNING THE VIRTUAL TERMINAL
        // ==========================================
        // `exec` creates a completely separate shell process in the Operating System.
        // It runs the command asynchronously, so our Node.js server doesn't freeze.
        // We increase maxBuffer because security tools can spit out MASSIVE amounts of text.
        exec(command, { maxBuffer: 1024 * 1024 * 10 /* 10 MB limit */ }, (error, stdout, stderr) => {

            // -- A. Handle Critical Crashes --
            if (error) {
                // If the machine doesn't have Perl/Nikto installed, or the connection timed out,
                // `exec` catches the OS-level crash right here.
                console.error(`[Nikto Scanner] Critical OS error: ${error.message}`);
                return reject(error); // Rejecting the promise sends the error back to the Worker!
            }

            // -- B. Handle Terminal Warnings --
            if (stderr) {
                // stderr is "Standard Error". Sometimes tools print non-fatal warnings here.
                console.warn(`[Nikto Scanner] Non-fatal Warning: ${stderr}`);
            }

            // ==========================================
            // 3. CAPTURE & PARSE THE OUTPUT
            // ==========================================
            // `stdout` contains every single word that Nikto printed to the screen!
            console.log(`[Nikto Scanner] Scan finished! Analyzing ${stdout.length} characters of terminal output...`);

            const metadata = {};
            const vulnerabilities = [];

            // We split the massive block of text into an Array representing each individual line
            const lines = stdout.split('\n');

            // These are informational lines Nikto prints that we don't want to send to the AI
            const metadataKeywords = [
                "Target IP:", "Target Hostname:", "Target Port:", 
                "Start Time:", "End Time:", "Server:", 
                "Allowed HTTP Methods:", "Retrieved via header:",
                "Scan terminated:", "SSL Info:"
            ];

            // Loop through the terminal output line by line
            for (const line of lines) {
                if (line.includes('+') && line.trim().length > 5) {
                    const cleanLine = line.substring(line.indexOf('+') + 1).trim(); // Strip away the '+' sign

                    let isMetadata = false;
                    
                    // 1. Check if the line is just metadata (e.g. "Target IP: 1.2.3.4")
                    for (const keyword of metadataKeywords) {
                        if (cleanLine.startsWith(keyword)) {
                            isMetadata = true;
                            const parts = cleanLine.split(':');
                            const key = parts[0].trim();
                            const value = parts.slice(1).join(':').trim(); // Join back in case value has colons
                            metadata[key] = value;
                            break;
                        }
                    }

                    // 2. If it's not metadata, and not the final summary line, it's a real finding!
                    if (!isMetadata && !cleanLine.includes("items checked:") && !cleanLine.includes("host(s) tested")) {
                        vulnerabilities.push({
                            severity: "MEDIUM",         // Nikto doesn't easily give High/Low, so we default to Medium
                            message: cleanLine,
                            rawData: { originalLine: line } // We save the exact line so we never lose data
                        });
                    }
                }
            }

            // Fallback: If nothing was flagged, we still want to save proof that the scan ran
            if (vulnerabilities.length === 0) {
                vulnerabilities.push({
                    severity: "INFO",
                    message: "Nikto scan completed with no obvious critical flags.",
                    rawData: { fullOutputPreview: stdout.substring(0, 500) }
                });
            }

            // ==========================================
            // 4. RETURN OUTPUT
            // ==========================================
            // We resolve the Promise! This shoots the cleanly formatted Javascript Object
            // all the way back to the await call in your Worker file!
            resolve({ metadata, vulnerabilities });
        });
    });
}

// Export the function so it can be 'require'd by other files
module.exports = { runNikto };
