export const demoRecommendations = [
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

export async function getRecommendationPayload({ lastBook, readingMood }) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      recommendations: demoRecommendations,
      note: "Set OPENAI_API_KEY in Vercel or .env to enable live AI recommendations. Showing demo picks for now.",
      demoMode: true
    };
  }

  const recommendations = await getAiRecommendations({ lastBook, readingMood });
  return { recommendations, demoMode: false };
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
