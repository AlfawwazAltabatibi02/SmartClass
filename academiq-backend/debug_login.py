"""Quick debug script to check login issues."""
from database import get_db, db_available

print(f"DB available: {db_available()}")
print()

with get_db() as db:
    cur = db.cursor(dictionary=True)
    
    # Check what tables exist
    cur.execute("SHOW TABLES")
    tables = cur.fetchall()
    print("Tables in database:")
    for t in tables:
        print(f"  {t}")
    print()
    
    # Check users table
    cur.execute("SELECT COUNT(*) as cnt FROM users")
    row = cur.fetchone()
    print(f"Total users in 'users' table: {row['cnt']}")
    print()
    
    # Show first 5 users
    cur.execute("SELECT username, LEFT(password_hash, 60) as hash_preview, role FROM users LIMIT 5")
    rows = cur.fetchall()
    print("Sample users:")
    for row in rows:
        print(f"  role={row['role']}  username={row['username']}  hash={row['hash_preview']}")
    print()
    
    # Try admin specifically
    cur.execute("SELECT username, password_hash, role FROM users WHERE role = 'admin'")
    admins = cur.fetchall()
    print(f"Admin users found: {len(admins)}")
    for row in admins:
        print(f"  username={row['username']}  hash={row['password_hash']}")
