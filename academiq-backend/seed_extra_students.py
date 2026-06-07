"""Insert 70 additional students with generated emails and programs."""
from __future__ import annotations

from database import get_db


def _generate_email(full_name: str) -> str:
    parts = full_name.strip().split()
    if len(parts) >= 2:
        first_initial = parts[0][0].lower()
        last_name = parts[-1].lower()
        prefix = f"{first_initial}{last_name}"
    else:
        prefix = parts[0].lower()
    prefix = "".join(ch for ch in prefix if ch.isalnum())
    return f"{prefix}@ciu.edu.tr"


def seed_extra_students() -> None:
    new_students: list[tuple[str, str]] = [
        ("Adam", "Hawthorne"),
        ("Bria", "Kingsley"),
        ("Caleb", "Morrison"),
        ("Daria", "Whitaker"),
        ("Ethan", "Caldwell"),
        ("Farah", "Wellington"),
        ("Gavin", "Sinclair"),
        ("Helena", "Monroe"),
        ("Ivan", "Bradford"),
        ("Jade", "Winslow"),
        ("Kai", "Abernathy"),
        ("Lila", "Sutherland"),
        ("Mason", "Pennington"),
        ("Nora", "Harrington"),
        ("Owen", "Stirling"),
        ("Paula", "Kensington"),
        ("Quinn", "Langford"),
        ("Rami", "Blackwood"),
        ("Sara", "Easton"),
        ("Tariq", "Redford"),
        ("Uma", "Hawkins"),
        ("Vera", "Lockhart"),
        ("Wes", "Templeton"),
        ("Xena", "Ashford"),
        ("Yusuf", "Oakley"),
        ("Zara", "Pemberton"),
        ("Ava", "Weatherby"),
        ("Bilal", "Grantham"),
        ("Celia", "Marston"),
        ("Dylan", "Winchester"),
        ("Elif", "Blackburn"),
        ("Faris", "Carlton"),
        ("Grace", "Norwood"),
        ("Hadi", "Westfield"),
        ("Ines", "Briarwood"),
        ("Jonah", "Willoughby"),
        ("Kara", "Rutherford"),
        ("Luca", "Highland"),
        ("Maya", "Broadwell"),
        ("Noah", "Whitfield"),
        ("Orla", "Stanford"),
        ("Pavel", "Eldridge"),
        ("Rosa", "Fairchild"),
        ("Sami", "Kirkland"),
        ("Tessa", "Greenwood"),
        ("Uri", "Newfield"),
        ("Viktor", "Fleetwood"),
        ("Wafa", "Hartwell"),
        ("Ximena", "Bramwell"),
        ("Yara", "Chelmsford"),
        ("Zane", "Foxworth"),
        ("Aiden", "Southgate"),
        ("Bella", "Glasgow"),
        ("Cory", "Merrick"),
        ("Dina", "Sherwood"),
        ("Eli", "Dunford"),
        ("Fiona", "Rivers"),
        ("Galen", "Hillcrest"),
        ("Hana", "Northwood"),
        ("Iris", "Midsummer"),
        ("Jamal", "Chambers"),
        ("Kian", "Ellsworth"),
        ("Leah", "Crosby"),
        ("Mira", "Winthrop"),
        ("Nabil", "Harwood"),
        ("Omar", "Broadmoor"),
        ("Pia", "Glenwood"),
        ("Rhea", "Silverton"),
        ("Soren", "Thornhill"),
        ("Talia", "Ashby"),
    ]

    programs = [
        "Computer Engineering",
        "Civil Engineering",
        "Electrical and Electronics Engineering",
        "Industrial Engineering",
        "Mechanical Engineering",
        "Bioengineering",
        "Energy Systems Engineering",
        "Environmental Engineering",
        "Information Systems Engineering",
        "Petrol Oil and Gas Engineering",
        "Medicine",
        "Dentistry",
        "Education",
    ]

    with get_db() as db:
        cur = db.cursor()
        inserted = 0
        skipped = 0

        for idx, (first, last) in enumerate(new_students):
            full_name = f"{first} {last}"
            email = _generate_email(full_name)
            program = programs[idx % len(programs)]

            try:
                cur.execute(
                    "INSERT INTO students (name, email, program) VALUES (%s, %s, %s)",
                    (full_name, email, program),
                )
                inserted += 1
            except Exception:
                skipped += 1

        db.commit()

    print(f"Inserted {inserted} new students.")
    if skipped:
        print(f"Skipped {skipped} students due to duplicates or errors.")


if __name__ == "__main__":
    seed_extra_students()
