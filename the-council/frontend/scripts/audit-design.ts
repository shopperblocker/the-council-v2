/**
 * audit-design.ts — Scan all .tsx files for design system violations.
 *
 * Detects:
 * - Hardcoded hex colors (#xxx or #xxxxxx)
 * - Inline font-family styles
 * - Non-token gray classes (text-gray-*, bg-gray-*)
 * - Arbitrary spacing values ([px])
 *
 * Outputs JSON report to docs/design-audit-report.json
 * Usage: npx ts-node scripts/audit-design.ts
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(process.cwd(), "app");
const COMPONENTS = path.join(process.cwd(), "components");
const OUTPUT = path.join(process.cwd(), "..", "..", "docs", "design-audit-report.json");

interface Violation {
  file: string;
  line: number;
  type: string;
  match: string;
}

const CHECKS: Array<{ type: string; pattern: RegExp }> = [
  {
    type: "hardcoded-hex",
    pattern: /#[0-9a-fA-F]{3,6}\b/g,
  },
  {
    type: "inline-font-family",
    pattern: /fontFamily\s*:/g,
  },
  {
    type: "non-token-gray",
    pattern: /\b(text|bg|border)-gray-\d+\b/g,
  },
  {
    type: "arbitrary-spacing",
    pattern: /\b(p|px|py|m|mx|my|gap|space)-\[\d+px\]/g,
  },
];

function collectTsxFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsxFiles(fullPath));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function auditFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const relPath = path.relative(process.cwd(), filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const check of CHECKS) {
      const matches = line.match(check.pattern);
      if (matches) {
        for (const match of matches) {
          // Skip color values inside string template comments or design-system.ts definitions
          if (relPath.includes("design-system") || relPath.includes("tailwind.config")) continue;
          violations.push({
            file: relPath,
            line: i + 1,
            type: check.type,
            match,
          });
        }
      }
    }
  }

  return violations;
}

function run(): void {
  const start = Date.now();
  const allFiles = [
    ...collectTsxFiles(ROOT),
    ...collectTsxFiles(COMPONENTS),
  ];

  const allViolations: Violation[] = [];
  for (const file of allFiles) {
    allViolations.push(...auditFile(file));
  }

  // Summary by type
  const summary: Record<string, number> = {};
  for (const v of allViolations) {
    summary[v.type] = (summary[v.type] || 0) + 1;
  }

  // Top offending files
  const byFile: Record<string, number> = {};
  for (const v of allViolations) {
    byFile[v.file] = (byFile[v.file] || 0) + 1;
  }
  const topFiles = Object.entries(byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const report = {
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - start,
    files_scanned: allFiles.length,
    total_violations: allViolations.length,
    summary,
    top_offending_files: topFiles.map(([file, count]) => ({ file, count })),
    violations: allViolations,
  };

  // Ensure docs directory exists
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\nDesign Audit Complete`);
  console.log(`Files scanned: ${allFiles.length}`);
  console.log(`Violations: ${allViolations.length}`);
  console.log(`\nBy type:`);
  for (const [type, count] of Object.entries(summary)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log(`\nTop offending files:`);
  for (const [file, count] of topFiles.slice(0, 5)) {
    console.log(`  ${file}: ${count}`);
  }
  console.log(`\nReport saved to: ${OUTPUT}`);
  console.log(`Duration: ${Date.now() - start}ms`);
}

run();
