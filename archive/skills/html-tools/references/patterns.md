# HTML Tools — Pattern Reference

Detailed code examples and guidance for each pattern. Read this when implementing a specific pattern.

## Table of Contents

1. [Input Patterns](#input-patterns)
2. [Output Patterns](#output-patterns)
3. [State Patterns](#state-patterns)
4. [External Data Patterns](#external-data-patterns)
5. [Heavy Computation Patterns](#heavy-computation-patterns)
6. [Useful CORS-Enabled APIs](#useful-cors-enabled-apis)
7. [Useful CDN Libraries](#useful-cdn-libraries)

---

## Input Patterns

### Paste Input

Listen for the `paste` event on the document or a specific element. The clipboard can carry multiple formats simultaneously (plain text, HTML, RTF, images, files).

```javascript
document.addEventListener("paste", (e) => {
   e.preventDefault();

   // Plain text
   const text = e.clipboardData.getData("text/plain");

   // HTML (e.g., copying from a webpage preserves formatting)
   const html = e.clipboardData.getData("text/html");

   // RTF
   const rtf = e.clipboardData.getData("text/rtf");

   // Images (e.g., screenshots)
   const items = e.clipboardData.items;
   for (const item of items) {
      if (item.type.startsWith("image/")) {
         const blob = item.getAsFile();
         const url = URL.createObjectURL(blob);
         // Display or process the image
      }
   }
});
```

Building a clipboard debugging tool (that shows all available paste formats) is a great way to discover what data is available for a given paste source.

### File Input

Use `<input type="file">` — JavaScript can read file contents directly with the FileReader API. No upload server needed.

```html
<input type="file" id="fileInput" accept=".json,.csv,.txt" />
```

```javascript
document.getElementById("fileInput").addEventListener("change", (e) => {
   const file = e.target.files[0];
   if (!file) return;

   const reader = new FileReader();

   // For text files
   reader.onload = (event) => {
      const content = event.target.result;
      processContent(content);
   };
   reader.readAsText(file);

   // For binary files (images, PDFs), use:
   // reader.readAsArrayBuffer(file);
   // reader.readAsDataURL(file);  // gives base64 data URL
});
```

For multiple files, add the `multiple` attribute and iterate `e.target.files`.

### URL Parameters

Accept input or configuration via query string or hash. This makes tools linkable and shareable.

```javascript
// Reading from query params: ?package=llm&compare=0.27...0.28
const params = new URLSearchParams(window.location.search);
const pkg = params.get("package");
const compare = params.get("compare");

// Reading from hash: #{"taxonId":123,"days":"30"}
try {
   const state = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
} catch (e) {
   // No state in URL or invalid JSON
}
```

### Drag and Drop

```javascript
const dropZone = document.getElementById("dropZone");

dropZone.addEventListener("dragover", (e) => {
   e.preventDefault();
   dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
   dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
   e.preventDefault();
   dropZone.classList.remove("drag-over");

   // Dropped files
   const files = e.dataTransfer.files;
   if (files.length > 0) {
      handleFile(files[0]);
      return;
   }

   // Dropped text/URL
   const text = e.dataTransfer.getData("text/plain");
   if (text) handleText(text);
});
```

---

## Output Patterns

### Copy to Clipboard

Always include a copy button for text output. This is the single most useful output pattern.

```javascript
async function copyToClipboard(text, button) {
   try {
      await navigator.clipboard.writeText(text);
      const original = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => (button.textContent = original), 2000);
   } catch (err) {
      // Fallback for older browsers or non-HTTPS contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
   }
}
```

### Rich Clipboard (HTML + Plain Text)

Copy formatted content that preserves styling when pasted into rich text editors but degrades to plain text in code editors.

```javascript
async function copyRich(html, plainText) {
   const htmlBlob = new Blob([html], { type: "text/html" });
   const textBlob = new Blob([plainText], { type: "text/plain" });
   await navigator.clipboard.write([
      new ClipboardItem({
         "text/html": htmlBlob,
         "text/plain": textBlob,
      }),
   ]);
}
```

### Downloadable Files

Generate files for download entirely in the browser. Works for any format.

```javascript
function downloadFile(content, filename, mimeType = "text/plain") {
   const blob = new Blob([content], { type: mimeType });
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = filename;
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   URL.revokeObjectURL(url);
}

// Examples:
downloadFile(jsonString, "data.json", "application/json");
downloadFile(csvString, "export.csv", "text/csv");

// For binary data (e.g., images from a canvas):
canvas.toBlob((blob) => {
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = "image.png";
   a.click();
   URL.revokeObjectURL(url);
}, "image/png");
```

### ICS Calendar Files

```javascript
function generateICS(events) {
   let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HTML Tool//EN\n";
   for (const event of events) {
      ics += "BEGIN:VEVENT\n";
      ics += `DTSTART:${event.start}\n`;
      ics += `DTEND:${event.end}\n`;
      ics += `SUMMARY:${event.title}\n`;
      ics += "END:VEVENT\n";
   }
   ics += "END:VCALENDAR";
   downloadFile(ics, "events.ics", "text/calendar");
}
```

---

## State Patterns

### URL State (Small, Shareable)

Good for state under ~2KB. Makes the tool bookmarkable and shareable.

```javascript
// Save state to URL hash
function saveState(state) {
   window.location.hash = encodeURIComponent(JSON.stringify(state));
}

// Load state from URL hash
function loadState() {
   if (!window.location.hash) return null;
   try {
      return JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
   } catch {
      return null;
   }
}

// Update URL without adding to browser history (avoids back-button clutter)
function updateState(state) {
   const hash = "#" + encodeURIComponent(JSON.stringify(state));
   history.replaceState(null, "", hash);
}
```

For query-param style state (more readable URLs):

```javascript
function saveToParams(state) {
   const params = new URLSearchParams();
   for (const [key, value] of Object.entries(state)) {
      params.set(key, value);
   }
   history.replaceState(null, "", "?" + params.toString());
}
```

### localStorage (Larger State, Secrets)

Good for API keys, user preferences, drafts, and anything too large for URLs. Data stays on the user's device.

```javascript
// Save / load
localStorage.setItem("myTool_draft", JSON.stringify(data));
const data = JSON.parse(localStorage.getItem("myTool_draft") || "null");

// API key pattern: prompt once, store for reuse
function getApiKey(serviceName) {
   let key = localStorage.getItem(`${serviceName}_api_key`);
   if (!key) {
      key = prompt(`Enter your ${serviceName} API key:`);
      if (key) localStorage.setItem(`${serviceName}_api_key`, key);
   }
   return key;
}
```

Namespace localStorage keys with a tool-specific prefix to avoid collisions with other tools on the same domain.

---

## External Data Patterns

### Fetching CORS-Enabled APIs

If an API sends `Access-Control-Allow-Origin` headers, you can call it directly from browser JS. No proxy needed.

```javascript
async function fetchJSON(url) {
   const response = await fetch(url);
   if (!response.ok) throw new Error(`HTTP ${response.status}`);
   return response.json();
}

// Example: fetch a PyPI package
const data = await fetchJSON("https://pypi.org/pypi/requests/json");
console.log(data.info.version);
```

Always include error handling and a loading indicator:

```javascript
const output = document.getElementById("output");
output.textContent = "Loading...";
try {
   const data = await fetchJSON(url);
   renderData(data);
} catch (err) {
   output.textContent = `Error: ${err.message}`;
}
```

### Calling LLM APIs via CORS

OpenAI, Anthropic, and Gemini all support CORS, so you can call them directly from HTML tools. Store the API key in localStorage.

```javascript
// Anthropic Claude
async function callClaude(prompt, apiKey) {
   const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
         "x-api-key": apiKey,
         "anthropic-version": "2023-06-01",
         "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
         model: "claude-sonnet-4-20250514",
         max_tokens: 1024,
         messages: [{ role: "user", content: prompt }],
      }),
   });
   const data = await response.json();
   return data.content[0].text;
}

// OpenAI
async function callOpenAI(prompt, apiKey) {
   const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
         model: "gpt-4o",
         messages: [{ role: "user", content: prompt }],
      }),
   });
   const data = await response.json();
   return data.choices[0].message.content;
}
```

Important: never hardcode API keys in the HTML source. Always use the localStorage prompt-and-store pattern.

### GitHub Raw Content

Public GitHub repos have CORS-enabled raw content at `raw.githubusercontent.com`. This is behind a CDN, so it's fast and you don't need to worry much about rate limits.

```javascript
const url =
   "https://raw.githubusercontent.com/user/repo/main/path/to/file.json";
const data = await fetchJSON(url);
```

GitHub Gists are especially useful — they let tools persist state to a permanent URL via the Gist API (requires a token).

---

## Heavy Computation Patterns

### Pyodide (Python in the Browser)

Pyodide compiles CPython to WebAssembly. It loads from a CDN and can even install pure-Python PyPI packages at runtime via micropip.

```html
<script src="https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js"></script>
<script>
   async function main() {
      const pyodide = await loadPyodide();

      // Install packages from PyPI
      await pyodide.loadPackage("micropip");
      const micropip = pyodide.pyimport("micropip");
      await micropip.install("some-pure-python-package");

      // Run Python code
      const result = pyodide.runPython(`
        import json
        data = {"message": "Hello from Python!"}
        json.dumps(data)
    `);
      console.log(result);
   }
   main();
</script>
```

Pyodide is large (~20MB initial download) but cached after first load. Good for tools that genuinely need Python (pandas, numpy, etc.). For simple logic, prefer JS.

Built-in packages like numpy and pandas can be loaded with `pyodide.loadPackage('numpy')`.

### WebAssembly Libraries

Many powerful tools have been compiled to WebAssembly and are available via CDN:

- **Tesseract.js** — OCR engine: `https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js`
- **PDF.js** — PDF rendering: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.269/pdf.min.mjs`
- **FFmpeg.wasm** — Video/audio processing (large, use sparingly)
- **sql.js** — SQLite in the browser: `https://cdn.jsdelivr.net/npm/sql.js@1/dist/sql-wasm.js`

Check if a WebAssembly port exists before building complex processing from scratch.

---

## Useful CORS-Enabled APIs

These APIs allow direct browser-to-API calls without a proxy:

| API                       | Use Case                                      | Base URL                                                           |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| **PyPI**                  | Python package metadata, versions, wheel URLs | `https://pypi.org/pypi/{package}/json`                             |
| **GitHub**                | Public repo content (raw files, API)          | `https://api.github.com/repos/{owner}/{repo}/...`                  |
| **GitHub Raw**            | Raw file content (CDN-cached)                 | `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}` |
| **iNaturalist**           | Species observations, photos, taxonomy        | `https://api.inaturalist.org/v1/...`                               |
| **Bluesky (AT Protocol)** | Posts, threads, profiles                      | `https://public.api.bsky.app/xrpc/...`                             |
| **Mastodon**              | Posts, profiles, timelines (per-instance)     | `https://{instance}/api/v1/...`                                    |
| **OpenAI**                | LLM completions, audio, embeddings            | `https://api.openai.com/v1/...`                                    |
| **Anthropic**             | Claude completions                            | `https://api.anthropic.com/v1/messages`                            |
| **Gemini**                | Gemini completions                            | `https://generativelanguage.googleapis.com/...`                    |

Build a CORS-checking tool (`fetch` with `mode: 'cors'` and check for errors) to test whether a new API supports CORS before building around it.

---

## Useful CDN Libraries

Common libraries that work well in single-file HTML tools:

| Library          | CDN      | Use Case                   |
| ---------------- | -------- | -------------------------- |
| **js-yaml**      | cdnjs    | YAML parsing/serialization |
| **marked**       | cdnjs    | Markdown → HTML            |
| **highlight.js** | cdnjs    | Syntax highlighting        |
| **diff**         | cdnjs    | Text diffing               |
| **Papa Parse**   | cdnjs    | CSV parsing                |
| **Chart.js**     | cdnjs    | Simple charts              |
| **Leaflet**      | cdnjs    | Maps                       |
| **PDF.js**       | cdnjs    | PDF rendering              |
| **Tesseract.js** | jsdelivr | OCR                        |
| **exif-js**      | cdnjs    | EXIF data extraction       |
| **jszip**        | cdnjs    | ZIP file handling          |
| **Pyodide**      | jsdelivr | Full Python runtime        |

When selecting a library, prefer the one with the smallest footprint that solves the problem. Check cdnjs.com or jsdelivr.com for exact URLs with version pinning.
