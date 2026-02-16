# Setup

## Installation

See [Snowflake CLI Installation](https://docs.snowflake.com/en/developer-guide/snowflake-cli/installation/installation).

## Configuration

Config file location: `~/.snowflake/config.toml`

### Basic Config Structure

```toml
default_connection_name = "myconn"

[connections.myconn]
account = "ORG-ACCOUNT"
user = "USERNAME"
role = "ROLE_NAME"
warehouse = "WAREHOUSE_NAME"
database = "DATABASE_NAME"
schema = "SCHEMA_NAME"
```

### Authentication Methods

#### Key-Pair (Recommended for CLI/Agents)

**Step 1: Generate keys**
```bash
mkdir -p ~/.snowflake

# Generate private key (no passphrase)
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out ~/.snowflake/rsa_key.p8 -nocrypt

# Generate public key
openssl rsa -in ~/.snowflake/rsa_key.p8 -pubout -out ~/.snowflake/rsa_key.pub
```

**Step 2: Get public key for Snowflake**
```bash
grep -v "PUBLIC KEY" ~/.snowflake/rsa_key.pub | tr -d '\n'
```

**Step 3: Register in Snowflake** (requires admin or SECURITYADMIN role)
```sql
ALTER USER your_username SET RSA_PUBLIC_KEY='paste_key_here';
```

**Step 4: Config**
```toml
[connections.myconn]
account = "ORG-ACCOUNT"
user = "USERNAME"
authenticator = "SNOWFLAKE_JWT"
private_key_file = "~/.snowflake/rsa_key.p8"
role = "ROLE_NAME"
warehouse = "WAREHOUSE_NAME"
```

#### Password

```toml
[connections.myconn]
account = "ORG-ACCOUNT"
user = "USERNAME"
authenticator = "snowflake"
password = "your_password"
```

#### External Browser (SSO)

```toml
[connections.myconn]
account = "ORG-ACCOUNT"
user = "USERNAME"
authenticator = "externalbrowser"
```

## Test Connection

```bash
snow connection test
snow connection test -c connection_name
```

## Environment Variables

Override config with environment variables:

```bash
export SNOWFLAKE_ACCOUNT="ORG-ACCOUNT"
export SNOWFLAKE_USER="USERNAME"
export SNOWFLAKE_PASSWORD="password"
export SNOWFLAKE_CONFIG_FILE="/custom/path/config.toml"
```
