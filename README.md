# Kie API Personal Web App

Personal Next.js dashboard for interacting with [Kie.ai docs](https://docs.kie.ai/) endpoints with a server-side proxy.

## Features

- Keeps your `KIE_API_KEY` on the server (never exposed to browser code)
- GPT Image-2 text-to-image task creation (`gpt-image-2-text-to-image`)
- GPT Image-2 image-to-image task creation (`gpt-image-2-image-to-image`)
- Poll async task status by `task_id`
- Check account credits quickly
- Deploy-ready for Vercel

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
```

Then set:

```bash
KIE_API_KEY=your_real_key
```

3. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

- Frontend calls `POST /api/kie` (internal route)
- Route authenticates with:
  - `Authorization: Bearer <KIE_API_KEY>`
  - `Content-Type: application/json`
- Route forwards requests to `https://api.kie.ai`

## Deploy To Vercel

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. In Vercel Project Settings -> Environment Variables, add:
   - `KIE_API_KEY`
4. Deploy.

No extra config is required for standard Next.js deployment.

## GPT Image-2 Payloads Used

This app sends task creation requests to:

- `POST /api/v1/jobs/createTask`

Text-to-image payload:

```json
{
  "model": "gpt-image-2-text-to-image",
  "input": {
    "prompt": "your prompt",
    "aspect_ratio": "auto",
    "nsfw_checker": false
  }
}
```

Image-to-image payload:

```json
{
  "model": "gpt-image-2-image-to-image",
  "input": {
    "prompt": "your prompt",
    "input_urls": ["https://example.com/image.png"],
    "aspect_ratio": "auto",
    "nsfw_checker": false
  }
}
```

## Notes From Kie Docs

- Kie generation APIs are asynchronous; a `200` can mean "task created", not "task completed".
- Use a returned `task_id` and poll record info endpoints to track completion.
- Never expose API keys client-side.
