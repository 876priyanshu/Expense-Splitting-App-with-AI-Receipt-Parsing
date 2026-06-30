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
 PORT=5000
MONGO_URI=mongodb://root:priyanshu@ac-599a3yi-shard-00-00.7oh2hlk.mongodb.net:27017,ac-599a3yi-shard-00-01.7oh2hlk.mongodb.net:27017,ac-599a3yi-shard-00-02.7oh2hlk.mongodb.net:27017/?ssl=true&replicaSet=atlas-61o74z-shard-0&authSource=admin&appName=backend
JWT_SECRET=myRandomSecretKey12345SplitwiseAI
GROQ_API_KEY=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

4. Run `npm run dev`
5. Visit `http://localhost:5000/login`

## Settlement Algorithm
Given a set of expenses, the system calculates each user's net balance
(amount paid minus amount owed), then uses a greedy algorithm to match
the largest creditor with the largest debtor repeatedly, minimizing the
total number of transactions needed to settle the group.


