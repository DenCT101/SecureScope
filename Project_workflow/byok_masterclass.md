# The Bring Your Own Key (BYOK) Masterclass

"Bring Your Own Key" (BYOK) has become the gold standard for open-source AI applications. Instead of a developer paying a massive monthly bill to OpenAI or Google for thousands of users, the application forces the user to supply their own API key. The user pays their own bill, and the application remains free to distribute.

Here is the complete, behind-the-scenes lifecycle of how we implemented it, alternative ways to do it, and where you can research more.

---

## 1. The Lifecycle in SecureScope (End-to-End)

Let’s trace the exact path the API key takes from the user's brain to Google's servers.

### Step 1: The Frontend (Storage)
**File:** `client/src/pages/SplitLayout.jsx`
When the user types their key into the UI, React immediately stores it in their browser's `localStorage` (specifically under the key `securescope_gemini_key`). 
* **Why?** Because `localStorage` persists even if they close the tab. If we didn't do this, they would have to paste their key every single time they hit refresh. 
* **Security:** `localStorage` never leaves the user's computer. It is completely safe *as long as* the frontend code doesn't maliciously send it somewhere else.

### Step 2: The API Request (Transit)
**File:** `client/src/services/api.js`
When the user clicks "Launch Scan", we grab the key from `localStorage` and attach it to the JSON payload of the `POST /api/scans` request:
```javascript
const body = { url: "example.com", toolType: "NIKTO", geminiKey: "AIzaSy..." };
```

### Step 3: The API Controller & Validation (Reception)
**File:** `src/validators/scan.validator.js` & `src/services/scan.service.js`
The backend receives the request. The Zod validator ensures the `geminiKey` is a string (if provided). The controller passes this data down to the database layer.

### Step 4: The Database (Temporary Parking)
**File:** `prisma/schema.prisma`
We save the scan job to PostgreSQL, including the `geminiKey`. 
* **Wait, isn't saving API keys in the DB dangerous?** Yes, if left there permanently. But remember, this is an asynchronous queue. The worker might not pick up the scan for 10 seconds. The key *must* wait in the DB alongside the scan job so the worker knows which key belongs to which scan.

### Step 5: The Background Worker (Execution)
**File:** `src/workers/scanner.worker.js`
The worker pulls the pending scan from the DB. It runs the Nikto scan via Docker, then calls the LLM service:
```javascript
await translateVulnerabilitiesBatch(vulnerabilities, scan.geminiKey);
```

### Step 6: The LLM Service (The Call)
**File:** `src/services/llm.service.js`
Here is where the magic happens. Instead of initializing the Google Generative AI client once globally, **we initialize a brand new client for every single scan**, using the specific key passed to us:
```javascript
const genAI = new GoogleGenerativeAI(resolvedKey); 
// We use it, get the translation, and the genAI instance is destroyed by garbage collection.
```

### Step 7: The Cleanup (Security Scrubbing)
**File:** `src/workers/scanner.worker.js`
Once the translation is done, the worker updates the database to mark the scan as `COMPLETED`. At this exact moment, we set `geminiKey: null`. 
* **The Result:** The key existed in the database for exactly 30 seconds. It is wiped clean. This is called **Ephemeral Storage**.

---

## 2. Is this the "Actual" Method? (Alternative Approaches)

The method we used—passing the key per-request and storing it ephemerally in the DB for background workers—is very common for **asynchronous, local-first apps**. However, depending on the architecture, there are two other main ways BYOK is implemented:

### Method A: Client-Side Direct (The "Zero Backend" Method)
Instead of sending the key to your backend, the React frontend calls the Google/OpenAI API directly from the browser.
* **Pros:** Unbeatable security. The key literally never touches your backend server or database.
* **Cons:** Browsers enforce CORS (Cross-Origin Resource Sharing). Many AI APIs block browser requests entirely to prevent people from accidentally leaking keys in frontends. You also can't do heavy background tasks if the user closes the tab.

### Method B: Encrypted Persistent Storage (The "SaaS" Method)
If you are building a real SaaS where users log in and set up automated weekly scans, they can't be at the computer to provide the key every week.
* **How it works:** The user enters the key once. The backend encrypts the key using AES-256 encryption and a master "Salt", and saves the encrypted string in the database forever. When a cron job runs, it decrypts the key in memory, uses it, and drops it.
* **Pros:** Fully automated for the user.
* **Cons:** If a hacker steals your database AND your master salt, all your users' keys are compromised.

---

## 3. Real-World GitHub Projects Using BYOK

If you want to study how top-tier open-source projects implement BYOK, check out these massive repositories. I highly recommend diving into their frontend state management and backend API routing to see how they pass the keys around.

> [!TIP]
> **1. Dify (langgenius/dify)**
> * **What it is:** A massive LLM application development platform.
> * **How they do it:** They use the **Encrypted Persistent Storage (Method B)**. Because users build complex apps that run 24/7, Dify takes the user's API key, encrypts it, stores it in Postgres, and decrypts it dynamically when workflows trigger.

> [!TIP]
> **2. Cline (cline/cline)**
> * **What it is:** The most popular autonomous AI coding agent for VS Code.
> * **How they do it:** This is a purely local app. They store your API key in VS Code's secure local `settings.json` vault. The extension reads it directly from your hard drive when it needs to write code for you.

> [!TIP]
> **3. Chatbot UI (mckaywrigley/chatbot-ui)**
> * **What it is:** An open-source clone of the ChatGPT interface.
> * **How they do it:** They use **Method A (Client-Side Direct) mixed with a lightweight proxy**. They store the key in `localStorage` just like we did, but they pass it in the `Authorization: Bearer <key>` HTTP Header instead of the JSON body. Their backend is just a "proxy" that forwards the request to OpenAI without ever saving the key to a database.

> [!TIP]
> **4. Lobe Chat (lobehub/lobe-chat)**
> * **What it is:** A highly customizable AI chat framework.
> * **How they do it:** Excellent example of hybrid BYOK. They allow you to use local models (like Ollama) where no key is needed, or you can paste an OpenAI/Gemini key which is stored in the browser state and attached to Edge Function API calls.

### Summary
What we built in SecureScope is a **Hybrid Ephemeral BYOK Architecture**. Because we need background workers (which require DB storage) but we don't want the liability of storing keys permanently, we temporarily park the key in the database and scrub it the second the job is done. It is elegant, secure, and perfectly suited for this project!
