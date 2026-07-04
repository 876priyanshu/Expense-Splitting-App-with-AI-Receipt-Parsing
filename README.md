# Expense Splitting App with AI Receipt Parsing

A backend system for splitting group expenses, featuring a debt-simplification
algorithm to minimize settlement transactions, JWT authentication, and AI-assisted
features for expense categorization, settlement explanations, and spending insights.

## Features
- JWT-based authentication (signup/login)
- Group creation and membership management
- Expense tracking with equal-split logic
- Debt-simplification algorithm to minimize the number of settlement transactions
- AI-powered expense categorization (Food, Travel, Accommodation, etc.)
- AI-generated plain-English settlement summaries
- AI-generated group spending insights
- Server-rendered frontend (EJS + Tailwind) for live demo, alongside a REST API

## Tech Stack
- Backend: Node.js, Express.js
- Database: MongoDB, Mongoose
- Auth: JWT, bcrypt
- AI: Groq (Llama 3.1) for categorization, summarization, and insights
- Frontend: EJS, Tailwind CSS
- Other: express-rate-limit for AI endpoint protection

## Architecture
- `services/settlementEngine.js` — pure algorithmic logic (no AI, no DB calls), handles net balance calculation and greedy debt simplification
- `services/aiService.js` — isolated AI integration layer, all LLM calls wrapped with timeouts and fallback handling
- `routes/api/*` — REST API endpoints returning JSON
- `routes/viewRoutes.js` — server-rendered HTML pages for the browser demo

## Setup Instructions
1. Clone the repo
2. Run `npm install`
3. Create a `.env` file with:
4. PORT=5000
MONGO_URI=your_mongo_uri
JWT_SECRET=your_secret_key
GROQ_API_KEY=\your_key
 

6. Run `npm run dev`
7. Visit `http://localhost:5000/login`

## Settlement Algorithm
Given a set of expenses, the system calculates each user's net balance
(amount paid minus amount owed), then uses a greedy algorithm to match
the largest creditor with the largest debtor repeatedly, minimizing the
total number of transactions needed to settle the group.


