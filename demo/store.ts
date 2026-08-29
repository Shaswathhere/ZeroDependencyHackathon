import * as fs from 'node:fs';
import * as path from 'node:path';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const DB_PATH = path.resolve(process.cwd(), 'demo/data.json');

// Initialize database if it doesn't exist
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([]), 'utf-8');
  }
}

export function getTodos(): Todo[] {
  initDB();
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data) as Todo[];
}

export function saveTodos(todos: Todo[]): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(todos, null, 2), 'utf-8');
}

export function getTodoById(id: string): Todo | undefined {
  const todos = getTodos();
  return todos.find((t) => t.id === id);
}

export function addTodo(title: string): Todo {
  const todos = getTodos();
  const newTodo: Todo = {
    id: Date.now().toString(),
    title,
    completed: false,
  };
  todos.push(newTodo);
  saveTodos(todos);
  return newTodo;
}

export function toggleTodo(id: string): Todo | null {
  const todos = getTodos();
  const todo = todos.find((t) => t.id === id);
  if (!todo) return null;
  
  todo.completed = !todo.completed;
  saveTodos(todos);
  return todo;
}

export function deleteTodo(id: string): boolean {
  let todos = getTodos();
  const initialLength = todos.length;
  todos = todos.filter((t) => t.id !== id);
  saveTodos(todos);
  return todos.length !== initialLength;
}
