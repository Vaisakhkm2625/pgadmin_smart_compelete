
connect to pg from pgadmin with server


| Field                    | Value                                    |
| ------------------------ | ---------------------------------------- |
| **Host name / address**  | `database`                               |
| **Port**                 | `5432`                                   |
| **Maintenance database** | `postgres`                               |
| **Username**             | value of `POSTGRES_USER` from `.env`     |
| **Password**             | value of `POSTGRES_PASSWORD` from `.env` |
| **Save password**        | ✅                                        |

extention is loaded in person 1 profile

---

don't forget sqlite3 shell

nix-shell -p sqlite


```
sqlite3 /home/vaisakh/vaisakhRoot/programming/sql/docker-compose-pg-vector/pgadmin-data/pgadmin4.db "SELECT query_info FROM query_history LIMIT 1"
```

run python injest query

run python app//





curl -X POST http://localhost:8000/complete -H "Content-Type: application/json" -d '{
       "recent_queries": [
         "SELECT * FROM accounts WHERE status = \"active\";",
         "SELECT count(*) FROM transactions;"
       ],
       "current_query": "SELECT * FR"
     }'

---
