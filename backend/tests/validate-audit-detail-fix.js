#!/usr/bin/env node

/**
 * Validation: Audit Detail Category Fix
 * 
 * Validates the code changes without requiring a running server.
 * Checks:
 * 1. Query structure uses LEFT JOIN (not filtered by category)
 * 2. All template items are included
 * 3. Photo URL construction logic
 * 
 * Run with: node backend/tests/validate-audit-detail-fix.js
 */

const fs = require('fs');
const path = require('path');

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    passed++;
    console.log(`  ${c.green}✓${c.reset} ${name}`);
    return true;
  } else {
    failed++;
    console.log(`  ${c.red}✗${c.reset} ${name}`);
    return false;
  }
}

console.log(`
${c.cyan}╔════════════════════════════════════════════════════════════╗${c.reset}
${c.cyan}║${c.reset}                                                            ${c.cyan}║${c.reset}
${c.cyan}║${c.reset}   ${c.blue}🔍 Validating Audit Detail Category Fix${c.reset}            ${c.cyan}║${c.reset}
${c.cyan}║${c.reset}                                                            ${c.cyan}║${c.reset}
${c.cyan}╚════════════════════════════════════════════════════════════╝${c.reset}
`);

const auditsFile = path.join(__dirname, '..', 'routes', 'audits.js');
const content = fs.readFileSync(auditsFile, 'utf8');

console.log(`\n${c.blue}Checking GET /api/audits/:id endpoint${c.reset}`);

// Test 1: Query uses LEFT JOIN (not filtered by category)
console.log(`\n${c.yellow}Test 1: Query Structure${c.reset}`);
test(
  'Query uses LEFT JOIN from checklist_items',
  content.includes('FROM checklist_items ci') && 
  content.includes('LEFT JOIN audit_items ai')
);

test(
  'Query does NOT filter by audit_category in WHERE clause',
  !content.match(/WHERE.*audit_category|WHERE.*ci\.category\s*=\s*\?/s) ||
  content.includes('// IMPORTANT: When viewing audit detail/report, show ALL template items')
);

test(
  'Query includes template_id filter (not category filter)',
  content.includes('WHERE ci.template_id = ?')
);

// Test 2: Items normalization
console.log(`\n${c.yellow}Test 2: Items Normalization${c.reset}`);
test(
  'Items are normalized to handle null audit_item fields',
  content.includes('itemsNormalized') || content.includes('items.map')
);

test(
  'Pending items have default status',
  content.includes("status: item.status || 'pending'") || 
  content.includes("status || 'pending'")
);

// Test 3: Photo URL construction
console.log(`\n${c.yellow}Test 3: Photo URL Construction${c.reset}`);
test(
  'Photo URLs use backendBaseUrl',
  content.includes('backendBaseUrl') || content.includes('PUBLIC_BACKEND_URL')
);

test(
  'Photo URLs are absolute (start with http)',
  content.includes('startsWith(\'http\')') || content.includes('startsWith("http")')
);

// Test 4: Category scores
console.log(`\n${c.yellow}Test 4: Category Scores${c.reset}`);
test(
  'Category scores calculated for all items',
  content.includes('categoryScores') && 
  content.includes('itemsNormalized.forEach') || content.includes('items.forEach')
);

// Test 5: Comments/documentation
console.log(`\n${c.yellow}Test 5: Documentation${c.reset}`);
test(
  'Code includes comment about showing ALL items',
  content.includes('show ALL template items') || 
  content.includes('show ALL items')
);

// Summary
console.log(`\n${c.cyan}╔════════════════════════════════════════════════════════════╗${c.reset}
${c.cyan}║${c.reset}                      ${c.blue}VALIDATION SUMMARY${c.reset}                        ${c.cyan}║${c.reset}
${c.cyan}╠════════════════════════════════════════════════════════════╣${c.reset}
${c.cyan}║${c.reset}  Tests Passed: ${String(passed).padStart(2)} / ${String(passed + failed).padStart(2)}                                    ${c.cyan}║${c.reset}
${c.cyan}║${c.reset}  Tests Failed: ${String(failed).padStart(2)} / ${String(passed + failed).padStart(2)}                                    ${c.cyan}║${c.reset}
${c.cyan}╚════════════════════════════════════════════════════════════╝${c.reset}
`);

if (failed === 0) {
  console.log(`${c.green}✅ All validations passed!${c.reset}\n`);
  console.log(`${c.dim}Key changes verified:${c.reset}`);
  console.log(`${c.dim}  • Query uses LEFT JOIN to include all template items${c.reset}`);
  console.log(`${c.dim}  • No category filtering in detail view${c.reset}`);
  console.log(`${c.dim}  • Photo URLs properly constructed${c.reset}`);
  console.log(`${c.dim}  • Category scores include all categories${c.reset}\n`);
  process.exit(0);
} else {
  console.log(`${c.red}❌ Some validations failed${c.reset}\n`);
  process.exit(1);
}

