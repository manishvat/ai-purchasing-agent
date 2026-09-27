# AI Purchasing Agent

A full-stack procurement agent built for the AI Purchasing Agent assignment.

## End-to-end flow

**Investigate → Decide → Act → Validate**

A buyer enters an item, quantity, budget and priority. The agent:
1. Investigates mock supplier data.
2. Scores suppliers using price, delivery, quality, warranty, risk and stock.
3. Makes and explains a purchasing decision.
4. Generates a mock purchase order.
5. Validates the action with independent checks.
6. Optionally uses an LLM for a concise explanation when `OPENAI_API_KEY` is configured.

## Stack

- Node.js + Express
- Vanilla HTML/CSS/JavaScript
- JSON mock supplier database
- REST endpoint: `POST /api/purchase`
- Deterministic decision engine so the demo works without an API key
- Optional OpenAI explanation layer

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

Optional AI layer: copy `.env.example` to `.env` and set `OPENAI_API_KEY`. The app remains usable without it.

## Architecture

`buyer request → investigation → decision → mock purchase order → validation`

The design intentionally focuses on one complete scenario, as the assignment allows depth in one scenario and accepts mock APIs/databases.

## Safety

The Act stage only creates a draft/mock purchase order. No real supplier order or payment is placed.

## Production extensions

Real supplier APIs, authentication/RBAC, persistent database and audit log, ERP integration, supplier-price provenance, approval workflows, idempotency, retries, observability and evaluation datasets.