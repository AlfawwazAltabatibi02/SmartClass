"""Create the complaints table in the smart_class database."""
from database import get_db

SQL = """
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id   INT AUTO_INCREMENT PRIMARY KEY,
    instructor_id  INT NOT NULL,
    category       VARCHAR(50) NOT NULL DEFAULT 'general',
    subject        VARCHAR(200) NOT NULL,
    message        TEXT NOT NULL,
    priority       ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
    status         ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
    admin_response TEXT,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at    DATETIME,
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

if __name__ == "__main__":
    with get_db() as db:
        cur = db.cursor()
        cur.execute(SQL)
        db.commit()
        print("✅ complaints table created successfully")
        cur.close()
