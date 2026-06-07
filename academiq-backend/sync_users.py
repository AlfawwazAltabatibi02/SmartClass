"""Sync users from students/instructors tables into users table."""
import mysql.connector

from database import get_db
from security import hash_password

def generate_credentials(full_name):
    """Takes a name like 'Felix Babalarola' and returns ('fbabalarola@ciu.edu.tr', 'fbabalarola')"""
    if not full_name:
        return None, None
        
    parts = full_name.strip().split()
    if len(parts) >= 2:
        # First letter of first name + entire last name
        first_initial = parts[0][0].lower()
        last_name = parts[-1].lower()
        prefix = f"{first_initial}{last_name}"
    else:
        # Fallback just in case someone only has one name entered
        prefix = parts[0].lower()
        
    # Clean up any weird characters (like dashes or apostrophes)
    prefix = "".join(e for e in prefix if e.isalnum())
    
    username = f"{prefix}@ciu.edu.tr"
    password = prefix
    return username, password

def sync_users() -> None:
    with get_db() as db:
        cur = db.cursor(dictionary=True)

        try:
            print("Starting custom account sync...\n")

            # --- 1. SYNC ADMIN ---
            try:
                cur.execute(
                    "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
                    ("admin@ciu.edu.tr", hash_password("admin"), "admin"),
                )
                print("Created Admin: admin@ciu.edu.tr / admin")
            except mysql.connector.IntegrityError:
                print("Admin already exists. Skipping...")

            # --- 2. SYNC INSTRUCTORS ---
            cur.execute("SELECT instructor_id, name FROM instructors WHERE name IS NOT NULL")
            instructors = cur.fetchall()

            instructor_count = 0
            for inst in instructors:
                username, plain_password = generate_credentials(inst["name"])

                if username:
                    try:
                        cur.execute(
                            "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
                            (username, hash_password(plain_password), "instructor"),
                        )
                        cur.execute(
                            "UPDATE instructors SET email = %s WHERE instructor_id = %s",
                            (username, inst["instructor_id"]),
                        )
                        instructor_count += 1
                    except mysql.connector.IntegrityError:
                        pass

            # --- 3. SYNC STUDENTS ---
            cur.execute("SELECT student_id, name FROM students WHERE name IS NOT NULL")
            students = cur.fetchall()

            student_count = 0
            for stu in students:
                username, plain_password = generate_credentials(stu["name"])

                if username:
                    try:
                        cur.execute(
                            "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
                            (username, hash_password(plain_password), "student"),
                        )
                        cur.execute(
                            "UPDATE students SET email = %s WHERE student_id = %s",
                            (username, stu["student_id"]),
                        )
                        student_count += 1
                    except mysql.connector.IntegrityError:
                        pass

            db.commit()
            print("\nSUCCESS! Database Sync Complete.")
            print(f"Created/Updated {instructor_count} Instructors.")
            print(f"Created/Updated {student_count} Students.")
            print("\nExample Login:")
            print("Username: fbabalarola@ciu.edu.tr")
            print("Password: fbabalarola\n")

        except Exception as exc:
            print(f"An error occurred: {exc}")
            db.rollback()


if __name__ == "__main__":
    sync_users()