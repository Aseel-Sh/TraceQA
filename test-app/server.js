const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory data store with sample tasks
let tasks = [
  {
    id: 1,
    title: 'Setup development environment',
    description: 'Install Node.js, npm, and configure IDE',
    status: 'completed',
    createdAt: new Date('2026-05-01T10:00:00Z').toISOString()
  },
  {
    id: 2,
    title: 'Write API documentation',
    description: 'Document all API endpoints with examples',
    status: 'in-progress',
    createdAt: new Date('2026-05-01T14:30:00Z').toISOString()
  },
  {
    id: 3,
    title: 'Implement user authentication',
    description: 'Add JWT-based authentication to the API',
    status: 'pending',
    createdAt: new Date('2026-05-02T09:15:00Z').toISOString()
  }
];

let nextId = 4;

// Helper function to find task by ID
const findTaskById = (id) => {
  return tasks.find(task => task.id === parseInt(id));
};

// Helper function to validate task data
const validateTask = (task) => {
  const errors = [];
  
  if (!task.title || typeof task.title !== 'string' || task.title.trim() === '') {
    errors.push('Title is required and must be a non-empty string');
  }
  
  if (task.description !== undefined && typeof task.description !== 'string') {
    errors.push('Description must be a string');
  }
  
  if (task.status && !['pending', 'in-progress', 'completed'].includes(task.status)) {
    errors.push('Status must be one of: pending, in-progress, completed');
  }
  
  return errors;
};

// Routes

// GET /api/tasks - List all tasks
app.get('/api/tasks', (req, res) => {
  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

// GET /api/tasks/:id - Get a specific task
app.get('/api/tasks/:id', (req, res) => {
  const task = findTaskById(req.params.id);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: task
  });
});

// POST /api/tasks - Create a new task
app.post('/api/tasks', (req, res) => {
  const { title, description, status } = req.body;
  
  // Validate input
  const errors = validateTask(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }
  
  // Create new task
  const newTask = {
    id: nextId++,
    title: title.trim(),
    description: description ? description.trim() : '',
    status: status || 'pending',
    createdAt: new Date().toISOString()
  };
  
  tasks.push(newTask);
  
  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: newTask
  });
});

// PUT /api/tasks/:id - Update a task
app.put('/api/tasks/:id', (req, res) => {
  const task = findTaskById(req.params.id);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }
  
  const { title, description, status } = req.body;
  
  // Validate input
  const errors = validateTask(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }
  
  // Update task
  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (status !== undefined) task.status = status;
  task.updatedAt = new Date().toISOString();
  
  res.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: task
  });
});

// DELETE /api/tasks/:id - Delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const taskIndex = tasks.findIndex(task => task.id === parseInt(req.params.id));
  
  if (taskIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }
  
  const deletedTask = tasks.splice(taskIndex, 1)[0];
  
  res.status(200).json({
    success: true,
    message: 'Task deleted successfully',
    data: deletedTask
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Test API server running on http://localhost:${PORT}`);
  console.log(`✓ Available endpoints:`);
  console.log(`  - GET    /api/tasks       - List all tasks`);
  console.log(`  - GET    /api/tasks/:id   - Get a specific task`);
  console.log(`  - POST   /api/tasks       - Create a new task`);
  console.log(`  - PUT    /api/tasks/:id   - Update a task`);
  console.log(`  - DELETE /api/tasks/:id   - Delete a task`);
  console.log(`  - GET    /health          - Health check`);
  console.log(`\n✓ Sample tasks loaded: ${tasks.length}`);
});

module.exports = app;

// Made with Bob
