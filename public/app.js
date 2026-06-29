const form = document.querySelector("#recommendation-form");
const lastBookInput = document.querySelector("#last-book");
const moodInput = document.querySelector("#reading-mood");
const statusMessage = document.querySelector("#status");
const resultsTitle = document.querySelector("#results-title");
const recommendationsList = document.querySelector("#recommendations");
const submitButton = form.querySelector("button");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const lastBook = lastBookInput.value.trim();
  const readingMood = moodInput.value.trim();

  if (!lastBook) {
    lastBookInput.focus();
    return;
  }

  setLoading(true);
  setStatus(`Finding books that understand ${lastBook}...`);
  recommendationsList.replaceChildren();

  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ lastBook, readingMood })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Could not get recommendations.");
    }

    renderRecommendations(payload.recommendations || []);
    resultsTitle.textContent = `After ${lastBook}`;

    if (payload.demoMode) {
      setStatus(payload.note, "demo");
    } else {
      setStatus("Here are five AI-picked directions for your next shelf pull.");
    }
  } catch (error) {
    setStatus(error.message || "Something went wrong. Try another book title.", "error");
  } finally {
    setLoading(false);
  }
});

function renderRecommendations(recommendations) {
  recommendationsList.replaceChildren(
    ...recommendations.map((recommendation, index) => {
      const card = document.createElement("article");
      card.className = `recommendation-card${index === 0 ? " featured" : ""}`;

      const title = document.createElement("h3");
      title.textContent = recommendation.title;

      const author = document.createElement("p");
      author.className = "author";
      author.textContent = `by ${recommendation.author}`;

      const why = document.createElement("p");
      why.textContent = recommendation.why;

      const meta = document.createElement("div");
      meta.className = "card-meta";

      const mood = document.createElement("span");
      mood.className = "pill";
      mood.textContent = recommendation.mood;

      const confidence = document.createElement("span");
      confidence.className = "pill";
      confidence.textContent = `${recommendation.confidence}% match`;

      meta.append(mood, confidence);
      card.append(title, author, why, meta);

      return card;
    })
  );
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.innerHTML = isLoading
    ? "<span aria-hidden=\"true\">...</span> Reading the room"
    : "<span aria-hidden=\"true\">-&gt;</span> Find my next book";
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`.trim();
}
