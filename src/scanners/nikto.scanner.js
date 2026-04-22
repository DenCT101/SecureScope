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
        // 1. THE COMMAND STRING
        // ==========================================
        // You asked: "Nikto runs using Perl, how do we run it?"
        // Answer: We tell Node to type exactly what a human would type in the terminal!
        // 
        // Option A (Native Perl): `perl /opt/nikto/program/nikto.pl -h ${targetUrl}`
        // Option B (Docker)     : `docker run --rm frapsoft/nikto -h ${targetUrl}`
        // Option C (Global Path): `nikto -h ${targetUrl}`
        // 
        // We will use Option C, assuming you have Nikto installed in your system PATH, 
        // or you could swap it to Option B if you are running Docker!
        const command = `nikto -h ${targetUrl}`;

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

            const parsedResults = [];

            // We split the massive block of text into an Array representing each individual line
            const lines = stdout.split('\n');

            // Loop through the terminal output line by line
            for (const line of lines) {

                // Nikto prints findings with a plus sign at the start, like: "+ Server: Apache/2.4.41"
                // Let's do some very basic Regex / String matching to find the juicy vulnerabilities!
                if (line.includes('+') && line.trim().length > 5) {

                    parsedResults.push({
                        severity: "MEDIUM",         // Nikto doesn't easily give High/Low, so we default to Medium
                        message: line.substring(line.indexOf('+') + 1).trim(), // Strip away the '+' sign
                        rawData: { originalLine: line } // We save the exact line so we never lose data
                    });
                }
            }

            // Fallback: If nothing was flagged, we still want to save proof that the scan ran
            if (parsedResults.length === 0) {
                parsedResults.push({
                    severity: "INFO",
                    message: "Nikto scan completed with no obvious critical flags.",
                    rawData: { fullOutputPreview: stdout.substring(0, 500) }
                });
            }

            // ==========================================
            // 4. RETURN OUTPUT
            // ==========================================
            // We resolve the Promise! This shoots the cleanly formatted Javascript Array 
            // all the way back to the await call in your Worker file!
            resolve(parsedResults);
        });
    });
}

// Export the function so it can be 'require'd by other files
module.exports = { runNikto };
