import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

loadLocalEnv();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const demoRecommendations = [
  {
    title: "Piranesi",
    author: "Susanna Clarke",
    why: "It pairs mystery, atmosphere, and emotional discovery in a way that works for many recent literary or speculative reads.",
    mood: "Strange, elegant, quietly moving",
    confidence: 78
  },
  {
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    author: "Gabrielle Zevin",
    why: "It is an accessible next pick when someone wants character depth, creative ambition, and a story with momentum.",
    mood: "Warm, bittersweet, absorbing",
    confidence: 72
  },
  {
    title: "The Midnight Library",
    author: "Matt Haig",
    why: "It is a gentle bridge into reflective fiction, especially if the last book left you wanting something hopeful.",
    mood: "Reflective, humane, hopeful",
    confidence: 67
  }
];

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "POST" && url.pathname === "/api/recommend") {
      await handleRecommend(request, response);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    await serveStatic(url.pathname, response, request.method === "HEAD");
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Something went wrong while serving the app." });
  }
}).listen(port, host, () => {
  console.log(`Book Looker is running at http://${host}:${port}`);
});

async function handleRecommend(request, response) {
  const body = await readJsonBody(request);
  const lastBook = String(body.lastBook || "").trim();
  const readingMood = String(body.readingMood || "").trim();

  if (lastBook.length < 2) {
    sendJson(response, 400, { error: "Tell me the last book you read first." });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 200, {
      recommendations: demoRecommendations,
      note: "Set OPENAI_API_KEY in .env to enable live AI recommendations. Showing demo picks for now.",
      demoMode: true
    });
    return;
  }

  const recommendations = await getAiRecommendations({ lastBook, readingMood });
  sendJson(response, 200, { recommendations, demoMode: false });
}

async function getAiRecommendations({ lastBook, readingMood }) {
  const model = process.env.OPENAI_MODEL || "gpt-5.5";
  const prompt = [
    "You are a thoughtful bookstore staff member with excellent literary taste.",
    "Recommend exactly 5 books based on the reader's last completed book.",
    "Use variety: include at least one close match and one gentle surprise.",
    "Avoid recommending the same book they already read.",
    "Return only valid JSON with this shape:",
    "{\"recommendations\":[{\"title\":\"Book title\",\"author\":\"Author\",\"why\":\"One specific reason this fits.\",\"mood\":\"3-6 word reading vibe\",\"confidence\":86}]}",
    "",
    `Last book read: ${lastBook}`,
    readingMood ? `What they want next: ${readingMood}` : "What they want next: not specified"
  ].join("\n");

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      input: prompt,
      text: {
        format: {
          type: "json_object"
        }
      }
    })
  });

  if (!apiResponse.ok) {
    const message = await apiResponse.text();
    throw new Error(`OpenAI request failed: ${apiResponse.status} ${message}`);
  }

  const payload = await apiResponse.json();
  const content = extractResponseText(payload);
  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed.recommendations)) {
    throw new Error("AI response did not include recommendations.");
  }

  return parsed.recommendations.slice(0, 5).map((recommendation) => ({
    title: String(recommendation.title || "Untitled"),
    author: String(recommendation.author || "Unknown author"),
    why: String(recommendation.why || "This book should fit your recent reading mood."),
    mood: String(recommendation.mood || "Recommended next read"),
    confidence: clamp(Number(recommendation.confidence || 70), 1, 100)
  }));
}

function extractResponseText(payload) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const text = payload.output
    ?.flatMap((item) => item.content || [])
    .find((content) => content.type === "output_text" && typeof content.text === "string")
    ?.text;

  if (!text) {
    throw new Error("OpenAI response did not include text output.");
  }

  return text;
}

async function serveStatic(pathname, response, isHeadRequest = false) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
    });
    response.end(isHeadRequest ? undefined : file);
  } catch {
    const index = await readFile(join(publicDir, "index.html"));
    response.writeHead(200, { "Content-Type": mimeTypes[".html"] });
    response.end(isHeadRequest ? undefined : index);
  }
}

async function readJsonBody(request) {
  let rawBody = "";

  for await (const chunk of request) {
    rawBody += chunk;

    if (rawBody.length > 10000) {
      throw new Error("Request body is too large.");
    }
  }

  return rawBody ? JSON.parse(rawBody) : {};
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function loadLocalEnv() {
  const envPath = join(__dirname, ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
