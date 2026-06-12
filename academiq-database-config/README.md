# AcademIQ Database Setup (MySQL 8.x)

This folder contains the SQL scripts required to create and seed the `smart_class` database for AcademIQ.

---

## Prerequisites

- MySQL Server 8.x
- MySQL CLI (installed with MySQL Server)
- MySQL Workbench (optional, for viewing data)

---

## Setup

### 1. Install MySQL Server

Download and install the MySQL Installer Bundle:

```text
https://dev.mysql.com/downloads/installer/
```

- MySQL CLI
- Additional MySQL tools

---

### 2. Run the Database Setup Script

Note: If your local MySQL server is not running, the backend will not connect.

Open a terminal and navigate to this folder:

```bash
cd C:\Users\****\****\academiq\academiq-database-config
```

Then run:



```bash
cd "C:\program Files\MySQL\MySQL Server 8.0\bin"
.\mysql -u root -p  < README_RUN_ORDER.sql
```

You will be prompted for your MySQL root password.

This command connects to your local MySQL server (`localhost:3306` by default) and executes all SQL scripts inside `README_RUN_ORDER.sql`.

The script automatically:

- Creates the database
- Creates all tables
- Inserts seed data

---

### 3. Open MySQL Workbench (Optional)

Install and open MySQL Workbench if you want to browse the database visually.

Create or open a local connection using:

```text
Host: localhost
Port: 3306
User: root
```

After connecting:

1. Refresh the **Schemas** panel on the left side
2. Expand the `smart_class` database
3. Browse tables and data

---

## Verify Setup

Run the following query in MySQL CLI or Workbench:

```sql
USE smart_class;
SELECT COUNT(*) AS students FROM students;
```

If the count is greater than `0`, the database was created and seeded successfully.

---

## Troubleshooting

### `mysql` is not recognized

MySQL CLI is not added to your system PATH.

Add the MySQL `bin` folder to PATH, usually:

```text
C:\Program Files\MySQL\MySQL Server 8.0\bin
```

---

### Access denied for user `root`

The MySQL password is incorrect.

Try logging in manually:

```bash
mysql -u root -p
```

---

### `README_RUN_ORDER.sql` not found

Make sure you are inside the correct folder before running the command:

```bash
cd C:\Users\MS_01\Desktop\academiq\academiq-database-config
```