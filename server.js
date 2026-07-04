require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const viewRoutes = require('./routes/viewRoutes');
const insightsRoutes = require('./routes/insightsRoutes');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('express-rate-limit');
const app = express();
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 AI-related requests per window
  message: { message: 'Too many AI requests, please try again later.' },
});

app.use('/api/insights', aiLimiter);


app.set('view engine', 'ejs');
app.set('views', './views');

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/', viewRoutes);
app.use('/api/insights', insightsRoutes);
app.use(errorHandler);

app.get('/', (req, res) => {
  res.redirect('/login');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));