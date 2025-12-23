import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import psycopg2
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "8554")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

client = OpenAI(api_key=OPENAI_API_KEY)

class CompletionRequest(BaseModel):
    recent_queries: List[str]
    current_query: str

class CompletionResponse(BaseModel):
    suggestion: str

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def search_similar_queries(query_text: str, limit: int = 3):
    try:
        # Get embedding for the current partial query
        embedding = client.embeddings.create(
            input=[query_text], 
            model="text-embedding-3-small"
        ).data[0].embedding

        conn = get_db_connection()
        cur = conn.cursor()
        
        # Vector similarity search using <-> operator (L2 distance)
        cur.execute("""
            SELECT query_text 
            FROM query_embeddings 
            ORDER BY embedding <-> %s::vector 
            LIMIT %s;
        """, (embedding, limit))
        
        results = [row[0] for row in cur.fetchall()]
        print(results)
        cur.close()
        conn.close()
        return results
    except Exception as e:
        print(f"Search error: {e}")
        return []

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic can go here
    yield
    # Shutdown logic can go here

app = FastAPI(lifespan=lifespan, title="pgAdmin Smart Autocomplete API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/complete", response_model=CompletionResponse)
async def complete_query(request: CompletionRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")

    # 1. Search for similar historical queries
    similar_queries = search_similar_queries(request.current_query)
    
    # 2. Prepare prompt for LLM
    context_history = "\n".join([f"- {q}" for q in request.recent_queries[-3:]])
    similar_context = "\n".join([f"- {q}" for q in similar_queries])

    
    prompt = f"""
You are a SQL autocomplete assistant for pgAdmin.
Based on the user's recent activity and similar past queries, predict the completion for the current partial query.

User's Recent Queries:
{context_history}

Similar Past Queries:
{similar_context}

Current Partial Query:
{request.current_query}

Instruction: 
Return ONLY the completion string that should be appended to the current partial query to make it a valid and likely SQL statement. 
Do not repeat the partial query. Do not include markdown formatting.
If you cannot predict with confidence, return an empty string.
"""

    try:
        print(prompt)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful SQL assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            max_tokens=50
        )
        
        suggestion = response.choices[0].message.content.strip()
        return CompletionResponse(suggestion=suggestion)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
