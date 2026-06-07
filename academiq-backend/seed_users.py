"""Seed the users table with SHA-256 hashed passwords (matching the SQL script convention)."""
import hashlib
from database import get_db

def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

USERS = [
    # (username, plain_password, role)
    ("admin@ciu.edu.tr",                      "admin123",           "admin"),
    # Instructors
    ("mehmet.kusaf@ciu.edu.tr",               "mehmet.kusaf",       "instructor"),
    ("dervis.deniz@ciu.edu.tr",               "dervis.deniz",       "instructor"),
    ("melike.direkoglu@ciu.edu.tr",           "melike.direkoglu",   "instructor"),
    ("asad.ali@ciu.edu.tr",                   "asad.ali",           "instructor"),
    ("kamil.yurtkan@ciu.edu.tr",              "kamil.yurtkan",      "instructor"),
    ("felix.babalarola@ciu.edu.tr",           "felix.babalarola",   "instructor"),
    ("parvaneh.esmaili@ciu.edu.tr",           "parvaneh.esmaili",   "instructor"),
    ("halil.nadiri@ciu.edu.tr",               "halil.nadiri",       "instructor"),
    ("turgay.tugay@ciu.edu.tr",               "turgay.tugay",       "instructor"),
    ("sana.khoja@ciu.edu.tr",                 "sana.khoja",         "instructor"),
    ("ali.sahin@ciu.edu.tr",                  "ali.sahin",          "instructor"),
    ("levent.kaya@ciu.edu.tr",                "levent.kaya",        "instructor"),
    ("osman.yilmaz@ciu.edu.tr",               "osman.yilmaz",      "instructor"),
    ("fatma.ozkan@ciu.edu.tr",                "fatma.ozkan",        "instructor"),
    ("murat.demir@ciu.edu.tr",                "murat.demir",        "instructor"),
    # Students
    ("ahmed.hassan@student.ciu.edu.tr",       "ahmed.hassan",       "student"),
    ("fatima.alzahra@student.ciu.edu.tr",     "fatima.alzahra",     "student"),
    ("plamedi.kapuya@student.ciu.edu.tr",     "plamedi.kapuya",     "student"),
    ("amara.diallo@student.ciu.edu.tr",       "amara.diallo",       "student"),
    ("yusuf.okonkwo@student.ciu.edu.tr",      "yusuf.okonkwo",      "student"),
    ("nadia.bello@student.ciu.edu.tr",        "nadia.bello",        "student"),
    ("ibrahim.musa@student.ciu.edu.tr",       "ibrahim.musa",       "student"),
    ("leila.karimi@student.ciu.edu.tr",       "leila.karimi",       "student"),
    ("carlos.mendez@student.ciu.edu.tr",      "carlos.mendez",      "student"),
    ("aisha.suleiman@student.ciu.edu.tr",     "aisha.suleiman",     "student"),
    ("david.mensah@student.ciu.edu.tr",       "david.mensah",       "student"),
    ("sara.yilmaz@student.ciu.edu.tr",        "sara.yilmaz",        "student"),
    ("omar.farouk@student.ciu.edu.tr",        "omar.farouk",        "student"),
    ("kofi.asante@student.ciu.edu.tr",        "kofi.asante",        "student"),
    ("maria.santos@student.ciu.edu.tr",       "maria.santos",       "student"),
    ("zara.ahmed@student.ciu.edu.tr",         "zara.ahmed",          "student"),
    ("emmanuel.eze@student.ciu.edu.tr",       "emmanuel.eze",        "student"),
    ("hassan.ali@student.ciu.edu.tr",         "hassan.ali",          "student"),
    ("priya.sharma@student.ciu.edu.tr",       "priya.sharma",        "student"),
    ("lena.muller@student.ciu.edu.tr",        "lena.muller",         "student"),
    ("chidi.obi@student.ciu.edu.tr",          "chidi.obi",           "student"),
    ("sofia.andrade@student.ciu.edu.tr",      "sofia.andrade",       "student"),
    ("kenji.tanaka@student.ciu.edu.tr",       "kenji.tanaka",        "student"),
    ("rania.khalil@student.ciu.edu.tr",       "rania.khalil",        "student"),
    ("taiwo.adesanya@student.ciu.edu.tr",     "taiwo.adesanya",      "student"),
    ("amina.diop@student.ciu.edu.tr",         "amina.diop",          "student"),
    ("lucas.ferreira@student.ciu.edu.tr",     "lucas.ferreira",      "student"),
    ("hana.moradi@student.ciu.edu.tr",        "hana.moradi",         "student"),
    ("blessing.okeke@student.ciu.edu.tr",     "blessing.okeke",      "student"),
    ("yasmin.rashid@student.ciu.edu.tr",      "yasmin.rashid",       "student"),
]

with get_db() as db:
    cur = db.cursor()
    # Clear existing users (if any)
    cur.execute("DELETE FROM users")
    
    insert_sql = "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)"
    for username, password, role in USERS:
        cur.execute(insert_sql, (username, sha256(password), role))
    
    db.commit()
    print(f"Successfully inserted {len(USERS)} users into the users table.")

    # Verify
    cur.execute("SELECT COUNT(*) FROM users")
    count = cur.fetchone()[0]
    print(f"Verification: {count} users now in the database.")
    
    # Test admin login
    cur.execute("SELECT password_hash FROM users WHERE username = 'admin@ciu.edu.tr' AND role = 'admin'")
    row = cur.fetchone()
    if row:
        stored = row[0]
        expected = sha256("admin123")
        print(f"\nAdmin hash verification:")
        print(f"  Stored:   {stored}")
        print(f"  Expected: {expected}")
        print(f"  Match: {stored == expected}")
