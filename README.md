# NotebookLLM

**Talk to your documents. Get answers, not hallucinations.**

NotebookLLM is a RAG-powered document assistant. Drop in a file, ask anything about it, and the AI responds using only what's actually in that document — no guessing, no going off-script. Every answer is grounded in your content.

---

## What It Does

- **Document Q&A** — ask natural language questions; get answers backed by your own file
- **Zero hallucination policy** — the model is explicitly constrained to the uploaded document's content
- **Multi-format support** — works with PDF, DOCX, DOC, CSV, JSON, PPTX, and TXT
- **Local embeddings** — no third-party embedding API; vectors are generated on-server using a lightweight transformer model
- **Polished UI** — drag-and-drop upload, live typing indicators, suggestion chips, and a responsive sidebar that collapses on mobile

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Server | Node.js + Express |
| RAG pipeline | LangChain (`@langchain/community`, `@langchain/qdrant`) |
| Embeddings | `@xenova/transformers` — `all-MiniLM-L6-v2`, runs locally |
| Vector store | Qdrant |
| LLM | Groq — `llama-3.3-70b-versatile` |
| File handling | Multer |
| Config | dotenv + CORS |

### Frontend

| Layer | Technology |
|---|---|
| UI | Vanilla HTML, CSS, JavaScript |
| Fonts | Google Fonts — Syne + DM Sans |

### Infrastructure

| Service | Purpose |
|---|---|
| Render | Hosts the backend (Node.js) |
| Netlify | Serves the frontend as a static site |
| Qdrant Cloud | Managed vector database |

---

## Project Structure

```
final_project/
├── frontend/
│   ├── index.html           # Landing / home page
│   └── chat.html            # Main chat interface
│
└── backend/
    ├── server.js            # App entry point — Express setup, static file serving
    ├── package.json
    ├── qdrant.js            # Exports the active Qdrant collection name
    │
    ├── routes/
    │   ├── upload.route.js  # POST /uploads — receives file, triggers indexing
    │   └── chat.route.js    # POST /chat — takes query, returns grounded answer
    │
    ├── services/
    │   ├── loader.service.js   # Reads and parses uploaded files by extension
    │   ├── chunk.service.js    # Splits parsed content into overlapping text chunks
    │   ├── embed.service.js    # Converts chunks into 384-dim embedding vectors
    │   ├── vector.service.js   # Writes to and queries Qdrant
    │   └── rag.service.js      # Assembles context and calls the Groq LLM
    │
    └── utils/
        └── supportedFiles.js   # Allowlist of accepted file extensions
```

---

## Environment Variables

Inside the `backend/` directory, create a `.env` file:

```env
PORT=5000
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
COLLECTION_NAME=notebookllm
GROQ_API_KEY=your_groq_api_key
HF_TOKEN=your_huggingface_token
```

| Variable | How to obtain |
|---|---|
| `QDRANT_URL` | Qdrant Cloud dashboard → cluster detail page |
| `QDRANT_API_KEY` | Qdrant Cloud → **API Keys** → **Create API Key** |
| `COLLECTION_NAME` | Freely chosen — used to namespace your vector collection |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → **API Keys** |
| `HF_TOKEN` | [huggingface.co](https://huggingface.co) → **Settings → Access Tokens** |

> `.env` is gitignored by default. Never push it to version control.

---

## Running Locally

**Prerequisites:** Node.js v18+, a Qdrant instance (cloud or local Docker)

```bash
# Clone the repo
git clone https://github.com/Veekshitha11/notebooklm
cd your-repo/final_project

# Install backend dependencies
cd backend
npm install

# Start the dev server
npm run dev
```

Then visit `http://localhost:5000` — the backend serves the frontend automatically, so no separate dev server is needed.

---

## Deploying to Production

Three services need to be wired together. Set them up in this order.

### Step 1 — Qdrant Cloud

1. Sign up at [cloud.qdrant.io](https://cloud.qdrant.io)
2. Create a new cluster on the **Free tier**
3. Copy the **Cluster URL** from the dashboard
4. Under **API Keys**, generate a new key and save it

### Step 2 — Render (Backend)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo and configure:

| Field | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install --legacy-peer-deps` |
| Start Command | `npm start` |
| Instance Type | Free |

3. Add all five environment variables under **Advanced**
4. Deploy and copy the resulting URL (e.g. `https://your-app.onrender.com`)

### Step 3 — Netlify (Frontend)

1. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Configure the build:

| Field | Value |
|---|---|
| Base directory | `frontend` |
| Build command | *(leave blank)* |
| Publish directory | `frontend` |

3. Deploy and copy the site URL (e.g. `https://your-site.netlify.app`)

### Step 4 — Connect Frontend to Backend

In `frontend/chat.html`, point the API base URL at your Render deployment:

```javascript
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://your-app.onrender.com'; // ← replace with your Render URL
```

In `backend/server.js`, allow requests from your Netlify domain:

```javascript
app.use(cors({
  origin: ['https://your-site.netlify.app'], // ← replace with your Netlify URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
```

Push both changes — Render and Netlify will redeploy automatically.

---

## How the RAG Pipeline Works

```
User uploads file
       ↓
LangChain loads & parses it
       ↓
Split into 1000-char chunks (200-char overlap)
       ↓
Each chunk → 384-dim vector via all-MiniLM-L6-v2 (on-server)
       ↓
Vectors stored in Qdrant collection
       ↓
User asks a question
       ↓
Question embedded → top 3 chunks retrieved from Qdrant
       ↓
Chunks passed as context to Groq (llama-3.3-70b-versatile)
       ↓
Grounded answer returned to user
```

The model is instructed to answer only from the retrieved chunks — if the answer isn't in the document, it says so.

---

## Supported File Types

`.pdf` · `.docx` · `.doc` · `.csv` · `.json` · `.pptx` · `.txt`

---

## Things to Know

**Cold starts** — Render's free tier idles after 15 minutes of inactivity. The first request may take up to 30 seconds while the server wakes up. Subsequent requests are fast.

**One collection per file** — each upload creates a fresh Qdrant collection. The app always queries the most recently uploaded document; there's no multi-document memory across sessions.

**No embedding API costs** — vectors are generated entirely on the backend server using `@xenova/transformers`. The only external API calls are to Groq for the final LLM response.
