// Local dev entrypoint. In the cloud the app runs as a Lambda (see lambda.js).
const app = require('./app');
const { connectDB } = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Admin Backend running on port ${PORT}`)))
  .catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
