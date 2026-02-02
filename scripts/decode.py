import os
import sqlite3
import json
import platform

def decode_history(db_path):
    if not os.path.exists(db_path):
        print(f"Error: Could not find file at {db_path}")
        return

    print(f"Reading history from: {db_path}\n")
    
    try:

        # Connect in read-only mode to avoid locking issues
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.cursor()

        # Updated query based on your schema:
        # Using 'srno' instead of 'id' for ordering
        query = "SELECT dbname, query_info FROM query_history ORDER BY srno DESC"
        cursor.execute(query)
        print(query)

        rows = cursor.fetchall()
        
        if not rows:
            print("No query history found in the database.")
            return


        for row in rows:
            dbname = row[0]
            qinfo = row[1]
            # query_info is a JSON string
            try:
                json_str = bytes.fromhex(qinfo).decode('utf-8')
                history_item = json.loads(json_str)
                #print(history_item)
            except (json.JSONDecodeError, TypeError):
                continue

            # Extracting data based on the structure defined in query_history.py
            sql = history_item.get('query', 'N/A')
            start_time = history_item.get('start_time', 'N/A')
            status = history_item.get('status', 'Unknown')
            duration = history_item.get('duration', 0)

            
            print("=" * 70)
            print(f"DATABASE:  {dbname}")
            print(f"TIMESTAMP: {start_time}")
            print(f"STATUS:    {status} ({duration:.2f} ms)")
            print("-" * 70)
            print(f"{sql.strip()}")
            print("=" * 70 + "\n")

        conn.close()

    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    # Update this path if it's different from your manual path
    TARGET_DB = "/home/vaisakh/vaisakhRoot/programming/sql/docker-compose-pg-vector/pgadmin-data/pgadmin4.db"
    decode_history(TARGET_DB)
