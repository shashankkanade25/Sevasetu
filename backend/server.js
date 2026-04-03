const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Test API /test
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running and the test API works!' });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
