import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'mindforge.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const database = db;

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      delay_pattern TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      goal TEXT NOT NULL,
      deadline TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'active',
      survival_score REAL DEFAULT 100,
      risk_level TEXT DEFAULT 'low',
      predicted_delay_hours REAL DEFAULT 0,
      total_estimated_hours REAL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority_score INTEGER DEFAULT 50,
      estimated_minutes INTEGER DEFAULT 60,
      actual_minutes INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      is_critical INTEGER DEFAULT 0,
      can_skip INTEGER DEFAULT 0,
      why_priority TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT DEFAULT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_dependencies (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      depends_on_task_id TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS action_plans (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      planned_date TEXT NOT NULL,
      planned_hours REAL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rescue_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
      available_hours REAL NOT NULL,
      required_hours REAL NOT NULL,
      critical_tasks TEXT DEFAULT '[]',
      skip_tasks TEXT DEFAULT '[]',
      time_saved_hours REAL DEFAULT 0,
      new_survival_score REAL DEFAULT 0,
      new_completion_estimate TEXT DEFAULT NULL,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS calendar_availability (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      available_hours REAL DEFAULT 8,
      notes TEXT,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mind_maps (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE,
      nodes TEXT DEFAULT '[]',
      edges TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
}

export default getDb;
