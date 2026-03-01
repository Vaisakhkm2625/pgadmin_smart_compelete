# PgAdmin Smart Complete

## Description

PgAdmin Smart Complete is an intelligent SQL query autocompletion system designed to enhance the PostgreSQL development experience. It leverages historical query data and machine learning to provide context-aware query suggestions and completions within pgAdmin, helping developers write SQL queries faster and more efficiently.

### Features

- **Smart Query Completion**: AI-powered SQL query suggestions based on recent query history
- **pgAdmin Integration**: Browser extension that seamlessly integrates with pgAdmin
- **Query History Analysis**: Automatically ingests and analyzes query patterns from pgAdmin database
- **REST API**: Provides query completion suggestions via HTTP endpoints
- **Vector Database Support**: Uses pgvector for semantic query matching

---

## Quick Start

### Connect to PostgreSQL from pgAdmin with Server

| Field                    | Value                                    |
| ------------------------ | ---------------------------------------- |
| **Host name / address**  | `database`                               |
| **Port**                 | `5432`                                   |
| **Maintenance database** | `postgres`                               |
| **Username**             | value of `POSTGRES_USER` from `.env`     |
| **Password**             | value of `POSTGRES_PASSWORD` from `.env` |
| **Save password**        | ✅                                        |

### Extension Setup

The extension is loaded in the pgAdmin profile for automatic query history capture.

### Query History Management

SQLite3 shell commands for managing query history:

```bash
nix-shell -p sqlite
```

### Query History Database Access

```bash
sqlite3 /home/vaisakh/vaisakhRoot/programming/sql/docker-compose-pg-vector/pgadmin-data/pgadmin4.db "SELECT query_info FROM query_history LIMIT 1"
```

---

## Installation

1. **Initialize Database**:
   ```bash
   python scripts/initialize_db.py
   ```

2. **Ingest Query History**:
   ```bash
   python scripts/ingest_history.py
   ```

3. **Run API Server**:
   ```bash
   python app/main.py
   ```

---

## API Usage

### Query Completion Endpoint

Send a POST request to `http://localhost:8000/complete`:

```bash
curl -X POST http://localhost:8000/complete -H "Content-Type: application/json" -d '{
       "recent_queries": [
         "SELECT * FROM accounts WHERE status = \"active\";",
         "SELECT count(*) FROM transactions;"
       ],
       "current_query": "SELECT * FR"
     }'
```

**Example Response**:
```json
{
  "suggestions": [
    "SELECT * FROM",
    "SELECT * FROM customers",
    "SELECT * FROM transactions"
  ],
  "confidence": 0.95
}
```

---

## Project Structure

- `app/` - Main API application and query completion logic
- `extension/` - Browser extension for pgAdmin integration
- `scripts/` - Database initialization and query ingestion utilities

---

## Environment Variables

Configure the following in `.env`:
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - Database name
- `DATABASE_HOST` - Database host address

---

## Requirements

- Python 3.8+
- PostgreSQL with pgvector extension
- pgAdmin 4
- Modern web browser (for extension support)

---

## License

MIT License
