import { getRecommendationPayload } from "../lib/recommendations.js";

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const body = await readJsonBody(request);
    const lastBook = String(body.lastBook || "").trim();
    const readingMood = String(body.readingMood || "").trim();

    if (lastBook.length < 2) {
      sendJson(response, 400, { error: "Tell me the last book you read first." });
      return;
    }

    const payload = await getRecommendationPayload({ lastBook, readingMood });
    sendJson(response, 200, payload);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Could not create recommendations right now." });
  }
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    return request.body;
  }

  if (request.body) {
    const rawParsedBody = Buffer.isBuffer(request.body) ? request.body.toString("utf8") : String(request.body);
    return rawParsedBody ? JSON.parse(rawParsedBody) : {};
  }

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
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}
