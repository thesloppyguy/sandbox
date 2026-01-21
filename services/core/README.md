# Core Service

FastAPI-based core service with SQLModel, Alembic migrations, and comprehensive testing setup.

## Features

- **FastAPI** - Modern, fast web framework
- **SQLModel** - SQL databases in Python, designed for simplicity, compatibility, and robustness
- **Alembic** - Database migration tool
- **Pydantic** - Data validation using Python type annotations
- **PostgreSQL** - Database support via psycopg
- **Testing** - pytest with test fixtures
- **Logging** - Configurable logging setup
- **Error Handling** - Custom exception handlers
- **CORS** - Cross-origin resource sharing support

## Project Structure

```
app/
├── __init__.py
├── main.py                 # FastAPI application entry point
├── config/
│   ├── __init__.py        # Settings configuration
│   └── logging.py         # Logging configuration
├── clients/
│   ├── __init__.py
│   └── db.py              # Database client and session management
├── core/
│   ├── __init__.py
│   ├── dependencies.py    # FastAPI dependencies
│   ├── exceptions.py      # Custom exceptions
│   └── error_handlers.py  # Error handlers
├── models/
│   ├── __init__.py        # Model exports
│   └── example.py         # Example model
├── routes/
│   ├── __init__.py        # Route registration
│   ├── health.py          # Health check endpoints
│   └── example.py         # Example CRUD endpoints
├── tasks/
│   ├── __init__.py
│   └── example.py         # Example background tasks
└── utils/
    ├── __init__.py
    └── security.py        # Security utilities
```

## Setup

### Prerequisites

- Python 3.12+
- PostgreSQL
- uv (Python package manager)

### Installation

1. Install dependencies:
```bash
uv sync
```

2. Set up environment variables:
   - Copy `env.example` to `../.env` (one level up from `services/core/`)
   - Update the values in `.env` with your actual configuration
   
   Example:
   ```bash
   cp env.example ../.env
   # Then edit ../.env with your values
   ```
   
   Required variables:
   - `PROJECT_NAME` - Name of your project
   - `POSTGRES_SERVER` - PostgreSQL server host
   - `POSTGRES_USER` - PostgreSQL username
   - `POSTGRES_PASSWORD` - PostgreSQL password (change from "changethis")
   - `POSTGRES_DB` - PostgreSQL database name
   - `SECRET_KEY` - Secret key for cryptographic operations (change from "changethis")

3. Run database migrations:
```bash
alembic upgrade head
```

4. Start the development server (from the `services/core` directory):

**Option 1: Using uvicorn directly**
```bash
uv run uvicorn app.main:app --reload
```

**Option 2: Using the script entry point**
```bash
uv run core --reload
```

**Option 3: Running as a module**
```bash
uv run python -m app.main
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/api/v1/openapi.json`

## Endpoints

### Health Check
- `GET /api/v1/health` - Service health status

### Examples
- `POST /api/v1/examples` - Create an example
- `GET /api/v1/examples` - List all examples
- `GET /api/v1/examples/{id}` - Get an example by ID
- `PATCH /api/v1/examples/{id}` - Update an example
- `DELETE /api/v1/examples/{id}` - Delete an example

## Database Migrations

### Create a new migration
```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply migrations
```bash
alembic upgrade head
```

### Rollback migrations
```bash
alembic downgrade -1
```

## Testing

Run tests:
```bash
pytest
```

Run tests with coverage:
```bash
pytest --cov=app --cov-report=html
```

## Development

### Code Quality

Format code:
```bash
ruff format .
```

Lint code:
```bash
ruff check .
```

Type checking:
```bash
mypy app
```

## Configuration

The service uses Pydantic Settings for configuration. All settings can be configured via environment variables or a `.env` file.

Key settings:
- `PROJECT_NAME` - Project name (required)
- `POSTGRES_SERVER` - PostgreSQL server (required)
- `POSTGRES_USER` - PostgreSQL user (required)
- `POSTGRES_PASSWORD` - PostgreSQL password (required)
- `POSTGRES_DB` - PostgreSQL database name (required)
- `FRONTEND_HOST` - Frontend host URL
- `ENVIRONMENT` - Environment (local, staging, production)
- `SECRET_KEY` - Secret key for cryptographic operations
- `BACKEND_CORS_ORIGINS` - CORS origins (comma-separated)

## License

Add your license here.
