const axios = require('axios');

const explainSettlement = async (transactions, groupName) => {
  // If there's nothing to explain, skip the AI call entirely
  if (!transactions || transactions.length === 0) {
    return "Everyone in this group is settled up — no payments needed.";
  }

  const transactionText = transactions
    .map(t => `${t.fromName} owes ${t.toName} ₹${t.amount}`)
    .join(', ');

  const prompt = `You are a helpful assistant summarizing a group expense settlement.
Group: ${groupName}
Settlements needed: ${transactionText}

Write a short, friendly 1-2 sentence summary explaining who needs to pay whom. Keep it casual and clear, like you're texting a friend. Do not add any extra commentary or formatting, just the summary text.`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000, // 8 second timeout, don't let the app hang forever
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.error('AI explanation failed:', err.message);
    // Fallback - never break the page just because AI failed
    return `Settlement summary: ${transactionText}.`;
  }
};
const categorizeExpense = async (description) => {
  const prompt = `Categorize this expense into exactly ONE of these categories: Food, Travel, Accommodation, Shopping, Entertainment, Utilities, Other.
Expense description: "${description}"
Respond with ONLY the category word, nothing else.`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    const category = response.data.choices[0].message.content.trim();
    const validCategories = ['Food', 'Travel', 'Accommodation', 'Shopping', 'Entertainment', 'Utilities', 'Other'];
    return validCategories.includes(category) ? category : 'Other';
  } catch (err) {
    console.error('Categorization failed:', err.message);
    return 'Uncategorized'; // fallback - never block expense creation
  }
};
const generateSpendingInsights = async (expenses, groupName) => {
  if (!expenses || expenses.length === 0) {
    return "No expenses logged yet for this group.";
  }

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = {};
  expenses.forEach(e => {
    const cat = e.category || 'Uncategorized';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
  });

  const categorySummary = Object.entries(categoryTotals)
    .map(([cat, total]) => `${cat}: ₹${total}`)
    .join(', ');

  const prompt = `You are analyzing group spending data for "${groupName}".
Total spent: ₹${totalSpent}
Breakdown by category: ${categorySummary}
Number of expenses: ${expenses.length}

Write a short 2-3 sentence insight summary - mention the biggest spending category and any notable pattern. Keep it casual and useful, like a quick financial tip for the group. No formatting, just plain text.`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.error('Insights generation failed:', err.message);
    return `Total spent: ₹${totalSpent}. Breakdown: ${categorySummary}.`;
  }
};

module.exports = { explainSettlement, categorizeExpense, generateSpendingInsights };
