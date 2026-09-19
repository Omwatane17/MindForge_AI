# MindForge AI — Backend & Database Layer

This directory contains the database storage, data services, and backend configuration for MindForge AI.

## Structure

```
backend/
└── database/
    ├── mindforge.db         # Primary SQLite database file
    ├── mindforge.db-shm     # Shared memory WAL file
    └── mindforge.db-wal     # Write-Ahead Log journal file
```

## Database Storage & Engine

- **Database System**: SQLite3 via `better-sqlite3` with Write-Ahead Logging (`WAL`) mode enabled.
- **Location**: `backend/database/mindforge.db`
- **Schemas**:
  - `users`: User authentication & accounts.
  - `projects`: Goals, deadlines, priority scores, and survival tracking.
  - `tasks`: Generated tasks, estimated minutes, criticality flags, and priorities.
  - `task_dependencies`: Directed graph edges representing task dependencies.
  - `action_plans`: Day-by-day scheduling breakdown.
  - `calendar_availability`: Daily user work capacity.
  - `mind_maps`: Flowchart node and edge graph data for visual workflow map.
