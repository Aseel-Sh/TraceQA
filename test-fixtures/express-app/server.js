const express = require('express');
const app = express();

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User registration
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  res.status(201).json({ 
    message: 'User registered successfully',
    userId: Math.floor(Math.random() * 10000)
  });
});

// User login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  
  res.json({ 
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    expiresIn: 3600
  });
});

// Get user profile
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  res.json({
    id: parseInt(id),
    username: 'testuser',
    email: 'test@example.com',
    createdAt: new Date().toISOString()
  });
});

// Update user profile
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  res.json({
    id: parseInt(id),
    ...updates,
    updatedAt: new Date().toISOString()
  });
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  res.json({
    message: 'User deleted successfully',
    id: parseInt(id)
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

module.exports = app;

// Made with Bob
