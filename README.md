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

- The API key is used only by the backend route; it is never sent to the browser.
- Set `OPENAI_MODEL` in `.env` to change the recommendation model.
- If no API key is configured, the app still opens and shows demo recommendations.

## Deploy to Vercel

This project is ready for Vercel:

- Static files live in `public/`.
- The recommendation endpoint lives in `api/recommend.js`.
- Set `OPENAI_API_KEY` in the Vercel project environment variables to enable live AI recommendations.
