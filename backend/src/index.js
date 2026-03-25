const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const analyticsRoutes = require('./routes/analytics');
const { startStellarStream } = require('./services/stellarStream');
const { startScheduledJobs } = require('./services/scheduler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Setup Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, async () => {
  console.log(`Analytics API running on port ${PORT}`);
  
  // Initialize services
  try {
    startStellarStream();
    startScheduledJobs();
    console.log('Blockchain ingestion and scheduled jobs started.');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
});
