#!/usr/bin/env node

/**
 * ============================================================================
 * COLLinSight Supabase Database Backup Utility
 * ============================================================================
 * Connects to Supabase using credentials in .env and exports all tables into
 * both structured JSON and executable PostgreSQL (.sql) files.
 *
 * Destination: src/db/backup/
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const backupDir = path.resolve(rootDir, "src/db/backup");

// 1. Parse .env
const envPath = path.resolve(rootDir, ".env");
if (!fs.existsSync(envPath)) {
  console.error("❌ Error: .env file not found at", envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ordered by dependency hierarchy (parents before children)
const TABLES = [
  "departments",
  "organizations",
  "users",
  "organization_members",
  "event_types",
  "expenditure_categories",
  "events",
  "event_signatories",
  "transactions",
  "initiatives",
  "audit_trail",
  "exported_reports",
];

// Helper to escape values for SQL
function formatSqlValue(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") {
    return Number.isNaN(val) ? "NULL" : String(val);
  }
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

// Generate executable SQL script
function generateSqlDump(tablesData, timestamp) {
  let sql = `-- ============================================================================
-- COLLinSight Database Backup Dump
-- Generated at: ${new Date().toISOString()} (${timestamp})
-- Supabase Source: ${supabaseUrl}
-- ============================================================================

BEGIN;

-- Temporarily adjust constraints/triggers if needed
SET client_encoding = 'UTF8';

`;

  for (const table of TABLES) {
    const rows = tablesData[table] || [];
    sql += `-- ----------------------------------------------------------------------------\n`;
    sql += `-- Table: public.${table} (${rows.length} rows)\n`;
    sql += `-- ----------------------------------------------------------------------------\n`;

    if (rows.length === 0) {
      sql += `-- No data in public.${table}\n\n`;
      continue;
    }

    const columns = Object.keys(rows[0]);
    const colList = columns.map((c) => `"${c}"`).join(", ");

    sql += `INSERT INTO public.${table} (${colList})\nVALUES\n`;

    const rowStrings = rows.map((row) => {
      const vals = columns.map((c) => formatSqlValue(row[c]));
      return `  (${vals.join(", ")})`;
    });

    // Use ON CONFLICT (id) DO UPDATE so the dump can be safely re-run without duplicate key errors
    const updateClauses = columns
      .filter((c) => c !== "id")
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(", ");

    if (updateClauses.length > 0) {
      sql += rowStrings.join(",\n") + `\nON CONFLICT (id) DO UPDATE SET\n  ${updateClauses};\n\n`;
    } else {
      sql += rowStrings.join(",\n") + `\nON CONFLICT (id) DO NOTHING;\n\n`;
    }
  }

  sql += `COMMIT;\n`;
  return sql;
}

async function runBackup() {
  console.log("🚀 Starting COLLinSight database backup...");
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const backupData = {
    _metadata: {
      timestamp: now.toISOString(),
      formattedDate: now.toLocaleString(),
      supabaseUrl,
      tableCounts: {},
      totalRecords: 0,
    },
    tables: {},
  };

  let totalRecords = 0;

  for (const table of TABLES) {
    process.stdout.write(`   Fetching [${table}]... `);
    const { data, error } = await supabase.from(table).select("*");

    if (error) {
      console.log(`❌ Failed: ${error.message}`);
      process.exit(1);
    }

    backupData.tables[table] = data || [];
    backupData._metadata.tableCounts[table] = (data || []).length;
    totalRecords += (data || []).length;
    console.log(`✓ (${(data || []).length} rows)`);
  }

  backupData._metadata.totalRecords = totalRecords;

  // File names
  const jsonFileName = `collinsight_backup_${timestamp}.json`;
  const sqlFileName = `collinsight_backup_${timestamp}.sql`;

  const jsonFilePath = path.join(backupDir, jsonFileName);
  const sqlFilePath = path.join(backupDir, sqlFileName);

  const latestJsonPath = path.join(backupDir, "latest_backup.json");
  const latestSqlPath = path.join(backupDir, "latest_backup.sql");

  // Write JSON
  console.log("\n📦 Writing JSON backup...");
  const jsonContent = JSON.stringify(backupData, null, 2);
  fs.writeFileSync(jsonFilePath, jsonContent, "utf-8");
  fs.writeFileSync(latestJsonPath, jsonContent, "utf-8");
  console.log(`   ✓ Saved: ${jsonFilePath}`);
  console.log(`   ✓ Updated latest: ${latestJsonPath}`);

  // Write SQL
  console.log("📝 Generating and writing SQL backup...");
  const sqlContent = generateSqlDump(backupData.tables, timestamp);
  fs.writeFileSync(sqlFilePath, sqlContent, "utf-8");
  fs.writeFileSync(latestSqlPath, sqlContent, "utf-8");
  console.log(`   ✓ Saved: ${sqlFilePath}`);
  console.log(`   ✓ Updated latest: ${latestSqlPath}`);

  console.log(`\n🎉 Backup complete! Successfully exported ${totalRecords} records across ${TABLES.length} tables.`);
  console.log(`📁 Files located at: ${backupDir}\n`);
}

runBackup().catch((err) => {
  console.error("❌ Unexpected error during backup:", err);
  process.exit(1);
});

