# AI Outreach Assistant (Perplexity Edition)

Streamlit-based rebuild of the AI Outreach Assistant. This version keeps the same core product behavior in a single Python app:

- User registration and login
- One global Perplexity API key per user
- Encrypted API key storage with AES-256-GCM
- Multiple projects per user
- Custom system prompt per project
- Persistent chat history in SQLite
- Perplexity responses built from system prompt + recent chat history + latest user input

## Stack

- Streamlit
- SQLite
- OpenAI SDK (Perplexity Compatible)
- PyJWT
- `cryptography` for AES-256-GCM
- `bcrypt` for password hashing

## Project Structure

```text
.
├── app.py
├── requirements.txt
├── .env.example
├── .streamlit/
│   └── config.toml
└── streamlit_src/
    ├── __init__.py
    ├── perplexity.py
    ├── config.py
    ├── database.py
    └── security.py
```

## Features

### Authentication

- Users can register and log in
- Session is stored with a signed cookie
- Passwords are hashed with `bcrypt`

### Global API Key

- User saves Perplexity API key once
- API key is encrypted before database storage
- Same saved key is used across all projects

### Multi-Project Workflow

- Create, edit, and delete projects
- Each project has its own system prompt
- Every project can have multiple chats

### AI Request Structure

Each Perplexity request includes:

- Project system prompt
- Recent chat history
- Latest user input

### Chat Behavior

- Messaging-style interface using Streamlit chat components
- User and assistant messages persist in SQLite
- First user message updates chat title automatically

## Local Run

### 1. Create a virtual environment

```bash
python -m venv .venv
```

### 2. Activate it

Windows PowerShell:

```bash
.venv\Scripts\Activate.ps1
```

Windows Command Prompt:

```bash
.venv\Scripts\activate.bat
```

macOS/Linux:

```bash
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create environment file

Copy `.env.example` to `.env` and set your values.

```env
DATABASE_PATH=ai_outreach.db
JWT_SECRET=change-this-before-deploy
ENCRYPTION_MASTER_KEY=base64-encoded-32-byte-key
PERPLEXITY_MODEL=sonar
```

To generate a key:

```bash
python -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"
```

### 5. Start the app

```bash
streamlit run app.py
```

Open:

- `http://localhost:8501`

## Streamlit Cloud Deployment

### 1. Push repo to GitHub

### 2. On Streamlit Community Cloud

- Create a new app
- Select repo
- Main file path: `app.py`

### 3. Add secrets in Streamlit Cloud

In app settings, add:

```toml
JWT_SECRET = "change-this-before-deploy"
ENCRYPTION_MASTER_KEY = "base64-encoded-32-byte-key"
PERPLEXITY_MODEL = "sonar"
DATABASE_PATH = "ai_outreach.db"
```

## Important Deployment Note

This app uses SQLite for persistence. On Streamlit Cloud, local file storage can be reset on redeploy or app restarts. For a more durable production deployment, the next step would be switching the database layer from SQLite to a managed database such as PostgreSQL or Supabase.

## What This App Solves

This is a project-based AI outreach system where each project behaves like its own assistant. The user controls the system prompt, while the app dynamically injects user input and recent conversation context at runtime to produce outreach-ready AI responses.
