import os
import sqlite3
import psycopg2
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Configuration
PGADMIN_DB_PATH = os.getenv("PGADMIN_DB_PATH", "./pgadmin-data/pgadmin4.db")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "8554")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

client = OpenAI(api_key=OPENAI_API_KEY)

def get_pgadmin_history():
    if not os.path.exists(PGADMIN_DB_PATH):
        print(f"pgAdmin database not found at {PGADMIN_DB_PATH}")
        return []
    
    try:
        conn = sqlite3.connect(PGADMIN_DB_PATH)
        cur = conn.cursor()
        # In pgAdmin4, query history is often in the 'query_history' table
        # We'll fetch the query text. Adjust column names if needed based on version.
        cur.execute("SELECT query FROM query_history WHERE query IS NOT NULL AND query != '';")
        rows = cur.fetchall()
        queries = list(set([row[0] for row in rows])) # Deduplicate
        conn.close()
        return queries
    except Exception as e:
        print(f"Error reading pgAdmin history: {e}")
        return []

def get_embedding(text):
    text = text.replace("\n", " ")
    return client.embeddings.create(input=[text], model="text-embedding-3-small").data[0].embedding

def store_embeddings(queries):
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cur = conn.cursor()

        for query in queries:
            print(f"Processing query: {query[:50]}...")
            embedding = get_embedding(query)
            
            cur.execute("""
                INSERT INTO query_embeddings (query_text, embedding)
                VALUES (%s, %s)
                ON CONFLICT (query_text) DO NOTHING;
            """, (query, embedding))
        
        conn.commit()
        print(f"Successfully processed {len(queries)} queries.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error storing embeddings: {e}")

if __name__ == "__main__":
    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY not set in .env")
    else:
        history_queries = get_pgadmin_history()
        if history_queries:
            store_embeddings(history_queries)
        else:
            print("No history queries found to process.")
