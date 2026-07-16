/**
 * Script to find the exact cause of the JSX error at line 907 in page.tsx.
 * Tracks brace nesting ({}) AND JSX element nesting around the error region.
 */
const fs = require("fs");
const path = require("path");

const filePath = path.resolve(__dirname, "src/app/phase-1/page.tsx");
const source = fs.readFileSync(filePath, "utf-8");
const lines = source.split("\n");

let mode = "code";
let templateBraceDepth = 0;

// Stack for {} braces
const braceStack = []; // { type, line, col, context }
// Stack for tracking element nesting conceptually (based on indentation patterns)
const divStack = [];

const ops = [];

function pushBrace(lineIdx, col) {
  const isJSXExpr = braceStack.length === 0;
  const entry = {
    type: isJSXExpr ? "JSX_EXPR" : "JS_BRACE",
    line: lineIdx + 1,
    col: col + 1,
    context: lines[lineIdx].substring(Math.max(0, col - 12), col + 20).trim(),
  };
  braceStack.push(entry);
  ops.push({ action: "PUSH", ...entry });
}

function popBrace(lineIdx, col) {
  if (braceStack.length === 0) {
    ops.push({ action: "POP_EMPTY", line: lineIdx + 1, col: col + 1,
      context: lines[lineIdx].substring(Math.max(0, col - 12), col + 20).trim() });
    return null;
  }
  const entry = braceStack.pop();
  ops.push({
    action: "POP", matched: entry,
    line: lineIdx + 1, col: col + 1,
    context: lines[lineIdx].substring(Math.max(0, col - 12), col + 20).trim(),
    remainingDepth: braceStack.length,
  });
  return entry;
}

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  let col = 0;
  const len = line.length;

  while (col < len) {
    const ch = line[col];
    const next = col + 1 < len ? line[col + 1] : null;

    if (mode === "multi_comment") {
      if (ch === "*" && next === "/") { mode = "code"; col += 2; }
      else { col++; }
      continue;
    }
    if (mode === "single_comment") { col++; continue; }
    if (mode === "single_string") {
      if (ch === "\\" && next) { col += 2; continue; }
      if (ch === "'") mode = "code";
      col++; continue;
    }
    if (mode === "double_string") {
      if (ch === "\\" && next) { col += 2; continue; }
      if (ch === '"') mode = "code";
      col++; continue;
    }
    if (mode === "template") {
      if (ch === "\\" && next) { col += 2; continue; }
      if (ch === "$" && next === "{") { templateBraceDepth++; col += 2; continue; }
      if (ch === "}" && templateBraceDepth > 0) { templateBraceDepth--; col++; continue; }
      if (ch === "`" && templateBraceDepth === 0) mode = "code";
      col++; continue;
    }

    if (ch === "/" && next === "/") { mode = "single_comment"; col += 2; continue; }
    if (ch === "/" && next === "*") { mode = "multi_comment"; col += 2; continue; }
    if (ch === "'") { mode = "single_string"; col++; continue; }
    if (ch === '"') { mode = "double_string"; col++; continue; }
    if (ch === "`") { mode = "template"; col++; continue; }

    if (ch === "{") pushBrace(lineIdx, col);
    else if (ch === "}") {
      const matched = popBrace(lineIdx, col);
      if (matched === null) {
        console.log("=".repeat(70));
        console.log("❌  UNMATCHED CLOSING BRACE '}' FOUND");
        console.log("=".repeat(70));
        console.log(`   File:     ${filePath}`);
        console.log(`   Line:     ${lineIdx + 1}`);
        console.log(`   Column:   ${col + 1}`);
        console.log(`   Context:  ${line.substring(Math.max(0, col - 30), Math.min(len, col + 30)).trim()}`);
        console.log("\nStack trace of most recent brace operations:");
        for (const op of ops.slice(-20)) {
          const arrow = op.action === "PUSH" ? "{" : "}";
          const detail = op.matched ? `→ L${op.matched.line}:${op.matched.col}` : "";
          console.log(`  [L${op.line}:${op.col}] ${arrow}  ${detail}`);
        }
        process.exit(1);
      }
    }

    col++;
  }
  if (mode === "single_comment") mode = "code";
}

if (braceStack.length > 0) {
  console.log("=".repeat(70));
  console.log(`❌  UNCLOSED BRACES (${braceStack.length} remaining)`);
  console.log("=".repeat(70));
  for (const e of braceStack)
    console.log(`   • ${e.type} at L${e.line}:${e.col} — "${e.context}"`);
  process.exit(1);
}

// ---- ANALYSIS ----
console.log("✅  All