# Examples

All examples use `--format json` for agent-friendly output.

## Querying Data

```bash
# Basic select
snow sql -q "SELECT * FROM database.schema.table LIMIT 100" --format json

# With filter
snow sql -q "SELECT * FROM users WHERE created_at > '2024-01-01'" --format json

# Aggregation
snow sql -q "SELECT status, COUNT(*) as cnt FROM orders GROUP BY status" --format json

# Join
snow sql -q "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id" --format json
```

## Exploring Schema

```bash
# List all databases
snow sql -q "SHOW DATABASES" --format json | jq '.[].name'

# List schemas in database
snow sql -q "SHOW SCHEMAS IN DATABASE mydb" --format json | jq '.[].name'

# List tables in schema
snow sql -q "SHOW TABLES IN mydb.myschema" --format json | jq '.[].name'

# Get table columns
snow sql -q "DESCRIBE TABLE mydb.myschema.mytable" --format json

# Get table DDL
snow sql -q "SELECT GET_DDL('TABLE', 'mydb.myschema.mytable')" --format json

# Row count
snow sql -q "SELECT COUNT(*) as cnt FROM mydb.myschema.mytable" --format json | jq '.[0].CNT'

# Sample data
snow sql -q "SELECT * FROM mydb.myschema.mytable SAMPLE (10 ROWS)" --format json
```

## Warehouse Management

```bash
# List warehouses
snow sql -q "SHOW WAREHOUSES" --format json | jq '.[] | {name, size, state}'

# Check warehouse status
snow sql -q "SHOW WAREHOUSES LIKE 'MY_WH'" --format json | jq '.[0].state'

# Resize warehouse
snow sql -q "ALTER WAREHOUSE my_wh SET WAREHOUSE_SIZE = 'MEDIUM'"

# Suspend/Resume
snow sql -q "ALTER WAREHOUSE my_wh SUSPEND"
snow sql -q "ALTER WAREHOUSE my_wh RESUME"
```

## Data Manipulation

```bash
# Insert
snow sql -q "INSERT INTO mytable (col1, col2) VALUES ('a', 1), ('b', 2)"

# Update
snow sql -q "UPDATE mytable SET col1 = 'new' WHERE id = 123"

# Delete
snow sql -q "DELETE FROM mytable WHERE created_at < '2023-01-01'"

# Truncate
snow sql -q "TRUNCATE TABLE mytable"
```

## Stage Operations

```bash
# List stages
snow sql -q "SHOW STAGES" --format json

# List files in stage
snow sql -q "LIST @mystage" --format json

# Upload file to stage
snow stage copy ./local_file.csv @mystage

# Download from stage
snow stage copy @mystage/file.csv ./local_dir/
```

## Query History

```bash
# Recent queries
snow sql -q "SELECT query_id, query_text, execution_status, total_elapsed_time 
FROM TABLE(information_schema.query_history()) 
ORDER BY start_time DESC LIMIT 10" --format json

# Failed queries
snow sql -q "SELECT query_id, query_text, error_message 
FROM TABLE(information_schema.query_history()) 
WHERE execution_status = 'FAIL' 
ORDER BY start_time DESC LIMIT 10" --format json
```

## Piping with jq

```bash
# Get table names as plain list
snow sql -q "SHOW TABLES" --format json | jq -r '.[].name'

# Filter by column value
snow sql -q "SELECT * FROM users" --format json | jq '.[] | select(.status == "active")'

# Extract specific fields
snow sql -q "SELECT * FROM orders" --format json | jq '.[] | {id, total, status}'

# Count results
snow sql -q "SHOW TABLES" --format json | jq 'length'

# Get first result
snow sql -q "SELECT * FROM users LIMIT 1" --format json | jq '.[0]'

# CSV-like output
snow sql -q "SELECT id, name FROM users" --format json | jq -r '.[] | [.ID, .NAME] | @csv'
```

## Multiple Statements

```bash
# Run SQL file
snow sql -f ./queries.sql --format json

# Multiple queries (semicolon separated)
snow sql -q "USE DATABASE mydb; USE SCHEMA myschema; SELECT * FROM mytable" --format json
```

## Using Different Connection

```bash
# Specify connection
snow sql -q "SHOW TABLES" -c prod_connection --format json

# Override database/schema
snow sql -q "SHOW TABLES" --database otherdb --schema otherschema --format json
```
