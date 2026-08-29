import { createApp, json, urlencoded, serveStatic, NodeDepRequest, NodeDepResponseWithCookies } from '../src/index.js';
import { getTodos, addTodo, toggleTodo, deleteTodo } from './store.js';

const app = createApp();
const PORT = 3000;

// Middleware
app.use(json());
app.use(urlencoded());
app.use(serveStatic('./demo/public'));

// HTML Template function
function renderHTML(todos: any[]) {
  const todosList = todos.map(todo => `
    <li class="todo-item ${todo.completed ? 'completed' : ''}">
      <span class="todo-text">${todo.title}</span>
      <div class="todo-actions">
        <form action="/todos/${todo.id}/toggle" method="POST" style="display:inline;">
          <button class="btn-toggle" type="submit">${todo.completed ? 'Undo' : 'Complete'}</button>
        </form>
        <form action="/todos/${todo.id}/delete" method="POST" style="display:inline;">
          <button class="btn-delete" type="submit">Delete</button>
        </form>
      </div>
    </li>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zero Dependency Todo App</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <h1>Zero Dependency Todo App</h1>
      <div class="todo-card">
        <form class="todo-form" action="/todos" method="POST">
          <input class="todo-input" type="text" name="title" placeholder="What needs to be done?" required autofocus>
          <button class="todo-submit" type="submit">Add Todo</button>
        </form>
        <ul class="todo-list">
          ${todosList.length > 0 ? todosList : '<p style="text-align: center; color: #888;">No todos yet! Add one above.</p>'}
        </ul>
      </div>
    </body>
    </html>
  `;
}


// Routes
// 1. Render the main page
app.get('/', (req: NodeDepRequest, res: NodeDepResponseWithCookies) => {
  const todos = getTodos();
  const html = renderHTML(todos);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// 2. Add a new todo
app.post('/todos', (req: NodeDepRequest, res: NodeDepResponseWithCookies) => {
  if (req.body && req.body.title) {
    addTodo(req.body.title.trim());
  }
  // Redirect back to home page after form submission
  res.redirect('/');
});

// 3. Toggle a todo's completed status
// Using POST instead of PUT/PATCH so it works without client-side JS
app.post('/todos/:id/toggle', (req: NodeDepRequest, res: NodeDepResponseWithCookies) => {
  const id = req.params.id;
  toggleTodo(id);
  res.redirect('/');
});

// 4. Delete a todo
// Using POST instead of DELETE so it works without client-side JS
app.post('/todos/:id/delete', (req: NodeDepRequest, res: NodeDepResponseWithCookies) => {
  const id = req.params.id;
  deleteTodo(id);
  res.redirect('/');
});

// API Routes for JSON testing (optional)
app.get('/api/todos', (req: NodeDepRequest, res: NodeDepResponseWithCookies) => {
  res.json(getTodos());
});

app.listen(PORT, () => {
  console.log(`\n✅ Server is running!`);
  console.log(`👉 Open http://localhost:${PORT} in your browser to see the Todo App.`);
});
