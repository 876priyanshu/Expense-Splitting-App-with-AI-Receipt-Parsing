const axios = require('axios');

const explainSettlement = async (transactions, groupName) => {
  if (!transactions || transactions.length === 0) return "Everyone in this group is settled up.";
  const transactionText = transactions.map(t => `${t.fromName} owes ${t.toName} ₹${t.amount}`).join(', ');
  const prompt = `Summarize this group settlement: ${groupName}. Settlements: ${transactionText}. Write 1 short casual sentence explaining who pays whom.`;
  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192', messages: [{ role: 'user', content: prompt }], max_tokens: 120
    }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }});
    return response.data.choices[0].message.content.trim();
  } catch (err) { return `Settlement summary: ${transactionText}.`; }
};

const categorizeExpense = async (description) => {
  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192', messages: [{ role: 'user', content: `Categorize this expense into ONE word (Food, Travel, Accommodation, Shopping, Entertainment, Utilities, Other): "${description}"` }], max_tokens: 10
    }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }});
    const valid = ['Food', 'Travel', 'Accommodation', 'Shopping', 'Entertainment', 'Utilities', 'Other'];
    const cat = response.data.choices[0].message.content.trim();
    return valid.includes(cat) ? cat : 'Other';
  } catch (err) { return 'Other'; }
};

const generateSpendingInsights = async (expenses, groupName) => {
  if (!expenses || expenses.length === 0) return "No expenses logged yet.";
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192', messages: [{ role: 'user', content: `Group "${groupName}" spent ₹${total} across ${expenses.length} expenses. Give a short 2-sentence financial tip based on this.` }], max_tokens: 120
    }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }});
    return response.data.choices[0].message.content.trim();
  } catch (err) { return `Total spent: ₹${total} across ${expenses.length} expenses.`; }
};

module.exports = { explainSettlement, categorizeExpense, generateSpendingInsights };