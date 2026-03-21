---
name: data-ops
description: |
  Database and data operations — schema design, queries, migrations, Supabase, D1, KV.
  Triggers: database, db, schema, migration, query, SQL, table, Supabase, D1, KV, data,
  데이터베이스, DB, 스키마, 마이그레이션, 쿼리, 테이블, 데이터,
  수파베이스, 디원, 케이브이, 데이터 넣어, 데이터 뽑아, 조회,
  insert, select, update, delete, join, index, foreign key
context: inline
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Data Ops

Database and data pipeline operations.

## Task
Data operation: $ARGUMENTS

## Supported Backends

### Supabase (PostgreSQL)
- Schema design with RLS policies
- Migrations via Supabase CLI
- Edge Functions integration

### Cloudflare D1 (SQLite)
- Schema + migrations
- Wrangler CLI: `wrangler d1 execute`

### Cloudflare KV
- Key-value operations
- TTL management

## Operations

### Schema Design
1. Analyze requirements
2. Design tables with proper types, constraints, indexes
3. Define relationships (FK, junction tables)
4. Add RLS policies if Supabase
5. Generate migration SQL

### Query Building
1. Understand the data need
2. Write optimized SQL
3. Add indexes for performance

### Migration
1. Generate migration file with timestamp
2. Include up + down migration
3. Validate against existing schema

## Rules
- Always include indexes for foreign keys
- Always include created_at/updated_at timestamps
- Use UUIDs for primary keys in Supabase
- Validate SQL syntax before executing
