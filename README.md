# Spark AI Sales & Marketing OS — UI/UX QA Final

Primary routes:
- `/` / `index.html` — Sales & Marketing OS
- `ai-agent.html` — AI Agent
- `human-agents.html` — Human Agents

Run locally:
```bash
npm start
```
Then open `http://127.0.0.1:8787`.

The design system is consolidated in `styles.css`. Consultation forms POST to `/api/consultation`.

## Vercel

Deploy from this `v7` directory using `npx vercel --prod`, or import a Git repository
in Vercel and set its Root Directory to `v7` (if the repository contains the parent folder).
The included configuration serves the HTML and assets without a build step.

The local server saves consultation leads under `data/`. That storage is not used
on Vercel. Until durable lead delivery is configured, the deployed API returns 503
and the form offers its existing WhatsApp link; it does not claim to save a lead.
