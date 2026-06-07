from database import get_db

with get_db() as db:
    cur = db.cursor()
    cur.execute("SHOW TABLES LIKE 'complaints'")
    result = cur.fetchall()
    if result:
        print("complaints table EXISTS")
        cur.execute("DESCRIBE complaints")
        for row in cur.fetchall():
            print(row)
    else:
        print("complaints table NOT FOUND")
    cur.close()
