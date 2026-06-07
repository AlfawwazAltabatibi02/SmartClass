from database import get_db
import mysql.connector

def create_admin_table():
    print(" Connecting to fix the database...")
    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Create the 'admins' table
        print(" Creating 'admins' table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) DEFAULT 'N/A'
            )
        """)

        # 2. Add a default admin user
        # Following your rule: Username 'admin@ciu.edu.tr' means Password is 'admin'
        print(" Adding default admin user...")
        try:
            cursor.execute(
                "INSERT INTO admins (username) VALUES (%s)",
                ('admin@ciu.edu.tr',)
            )
            print(" Default Admin created: admin@ciu.edu.tr")
        except mysql.connector.Error as err:
            if err.errno == 1062: # Already exists
                print(" Admin user already exists. Skipping...")
            else:
                raise err

        conn.commit()
        print("\n SUCCESS: Admin table is ready!")

if __name__ == "__main__":
    create_admin_table()