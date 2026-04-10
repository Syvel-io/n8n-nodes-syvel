#!/usr/bin/env node
'use strict';

/**
 * Post-build validation script.
 *
 * Verifies that:
 *  1. Every file declared in package.json#n8n exists in dist/
 *  2. The compiled node class conforms to the n8n INodeType contract
 *  3. The compiled credentials class conforms to the n8n ICredentialType contract
 *
 * Run after `npm run build`. Exits with code 1 on any failure.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

let failed = false;

function pass(msg) {
  console.log(`  ✓  ${msg}`);
}

function fail(msg) {
  console.error(`  ✗  ${msg}`);
  failed = true;
}

function assert(condition, msg) {
  if (condition) pass(msg);
  else fail(msg);
}

// ── 1. File existence ──────────────────────────────────────────────────────────

console.log('\n[1] Checking declared files exist in dist/\n');

const declaredFiles = [
  ...(pkg.n8n?.nodes ?? []),
  ...(pkg.n8n?.credentials ?? []),
];

for (const relPath of declaredFiles) {
  const full = path.join(ROOT, relPath);
  if (fs.existsSync(full)) {
    pass(relPath);
  } else {
    fail(`Missing: ${relPath}`);
  }
}

// Also check SVG assets (copied by copyfiles in the build script)
const svgSources = fs
  .readdirSync(path.join(ROOT, 'nodes'), { recursive: true })
  .filter((f) => f.endsWith('.svg'));

for (const svg of svgSources) {
  const distSvg = path.join(DIST, 'nodes', svg);
  if (fs.existsSync(distSvg)) {
    pass(`dist/nodes/${svg}`);
  } else {
    fail(`Missing SVG asset: dist/nodes/${svg}`);
  }
}

if (failed) {
  console.error('\nFile check failed — aborting.\n');
  process.exit(1);
}

// ── 2. Node contract ───────────────────────────────────────────────────────────

console.log('\n[2] Validating compiled node class\n');

for (const nodePath of pkg.n8n?.nodes ?? []) {
  const full = path.join(ROOT, nodePath);
  let mod;
  try {
    mod = require(full);
  } catch (e) {
    fail(`Cannot require ${nodePath}: ${e.message}`);
    continue;
  }

  // The class is a named export. description is set in the constructor (class field),
  // so we must instantiate to detect it — prototype.description will be undefined.
  const NodeClass = Object.values(mod).find((v) => {
    if (typeof v !== 'function') return false;
    try {
      const inst = new v();
      return typeof inst.description === 'object' && inst.description !== null;
    } catch {
      return false;
    }
  });

  if (!NodeClass) {
    fail(`${nodePath}: no INodeType class found (no exported class whose instance has a .description object)`);
    continue;
  }

  const instance = new NodeClass();
  const desc = instance.description;

  assert(typeof desc === 'object' && desc !== null, `description is an object`);
  assert(typeof desc.name === 'string' && desc.name.length > 0, `description.name is a non-empty string ("${desc.name}")`);
  assert(typeof desc.displayName === 'string' && desc.displayName.length > 0, `description.displayName is set`);
  assert(typeof desc.version === 'number' && desc.version >= 1, `description.version is a positive number (${desc.version})`);
  assert(Array.isArray(desc.inputs) && desc.inputs.length > 0, `description.inputs is a non-empty array`);
  assert(Array.isArray(desc.outputs) && desc.outputs.length > 0, `description.outputs is a non-empty array`);
  assert(Array.isArray(desc.credentials) && desc.credentials.length > 0, `description.credentials is a non-empty array`);
  assert(Array.isArray(desc.properties) && desc.properties.length > 0, `description.properties is a non-empty array`);
  assert(typeof instance.execute === 'function', `execute() method is present`);

  // Cross-check: every credential name referenced by the node must appear in pkg.n8n.credentials
  const declaredCredNames = (pkg.n8n?.credentials ?? []).map((p) => {
    // e.g. "dist/credentials/SyvelApi.credentials.js" -> load and get name
    try {
      const credMod = require(path.join(ROOT, p));
      const CredClass = Object.values(credMod).find((v) => typeof v === 'function');
      return CredClass ? new CredClass().name : null;
    } catch {
      return null;
    }
  });

  for (const credRef of desc.credentials) {
    assert(
      declaredCredNames.includes(credRef.name),
      `credential "${credRef.name}" referenced by node is declared in package.json#n8n.credentials`,
    );
  }
}

// ── 3. Credentials contract ────────────────────────────────────────────────────

console.log('\n[3] Validating compiled credentials class\n');

for (const credPath of pkg.n8n?.credentials ?? []) {
  const full = path.join(ROOT, credPath);
  let mod;
  try {
    mod = require(full);
  } catch (e) {
    fail(`Cannot require ${credPath}: ${e.message}`);
    continue;
  }

  const CredClass = Object.values(mod).find((v) => typeof v === 'function');

  if (!CredClass) {
    fail(`${credPath}: no ICredentialType class found`);
    continue;
  }

  const instance = new CredClass();

  assert(typeof instance.name === 'string' && instance.name.length > 0, `name is a non-empty string ("${instance.name}")`);
  assert(typeof instance.displayName === 'string' && instance.displayName.length > 0, `displayName is set`);
  assert(Array.isArray(instance.properties) && instance.properties.length > 0, `properties is a non-empty array`);
  assert(typeof instance.authenticate === 'object' && instance.authenticate !== null, `authenticate is defined`);
}

// ── Result ─────────────────────────────────────────────────────────────────────

if (failed) {
  console.error('\n✗ Build validation FAILED\n');
  process.exit(1);
} else {
  console.log('\n✓ Build validation passed\n');
}
