# Book Looker

Book Looker is a small AI-powered web app that asks what book someone last read, then recommends five books to read next.

## Run locally

1. Add your OpenAI API key:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and set `OPENAI_API_KEY`.

2. Start the app:

   ```bash
   npm start
   ```

3. Open `http://localhost:3000`.

## Notes

- The API key is used only by `server.js`; it is never sent to the browser.
- Set `OPENAI_MODEL` in `.env` to change the recommendation model.
- If no API key is configured, the app still opens and shows demo recommendations.
