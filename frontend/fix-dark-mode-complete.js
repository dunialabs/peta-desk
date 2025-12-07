#!/usr/bin/env node

/**
 * Complete dark mode fix - handles all edge cases
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // ========== Fix specific issues ==========

  // bg-[white] -> bg-white dark:bg-gray-900
  { from: /className="([^"]*?)\bbg-\[white\]\b(?!\s+dark:)/g, to: 'className="$1bg-white dark:bg-gray-900' },

  // Border rgba patterns
  { from: /border-gray-200 dark:border-gray-700 dark:border-gray-700/g, to: 'border-gray-200 dark:border-gray-700' },

  // Text colors with rgba
  { from: /text-\[rgba\(0,\s*0,\s*0\.85\)\]/g, to: 'text-gray-900 dark:text-gray-100' },
  { from: /text-\[rgba\(0,\s*0,\s*0,\s*0\.85\)\]/g, to: 'text-gray-900 dark:text-gray-100' },

  // Hex colors (case-insensitive)
  { from: /className="([^"]*?)\btext-\[#26251e\]\b(?!\s+dark:)/gi, to: 'className="$1text-[#26251E] dark:text-gray-100' },

  // Background rgba
  { from: /bg-\[rgba\(0,\s*0,\s*0,\s*0\.10?\)\]/g, to: 'bg-gray-100 dark:bg-gray-800' },
  { from: /bg-\[rgba\(0,\s*0,\s*0,\s*0\.05\)\]/g, to: 'bg-gray-50 dark:bg-gray-800' },

  // Border b with specific color
  { from: /border-b border-gray-100(?!\s+dark:)/g, to: 'border-b border-gray-100 dark:border-gray-700' },

  // Remove duplicate dark: classes in same property
  { from: /(dark:[a-z-]+\/?\d*)\s+\1/g, to: '$1' },
];

// Additional targeted fixes
const inlineStyleFixes = [
  // Replace inline style backgrounds with className
  {
    pattern: /(<div[^>]*?)style=\{\{\s*background:\s*['"]#28CD41['"]\s*\}\}([^>]*?className="[^"]*?)(">)/g,
    replacement: '$1$2 bg-green-500 dark:bg-green-400$3'
  },
  {
    pattern: /(<div[^>]*?)style=\{\{\s*background:\s*['"]#999['"]\s*\}\}([^>]*?className="[^"]*?)(">)/g,
    replacement: '$1$2 bg-gray-500 dark:bg-gray-400$3'
  },
  {
    pattern: /(<div[^>]*?)style=\{\{\s*background:\s*['"]var\(--Accents-Red,\s*#FF3B30\)['"]\s*\}\}([^>]*?className="[^"]*?)(">)/g,
    replacement: '$1$2 bg-red-500 dark:bg-red-400$3'
  },
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply all text replacements
    for (const repl of replacements) {
      const before = content;
      content = content.replace(repl.from, repl.to);
      if (content !== before) {
        modified = true;
      }
    }

    // Apply inline style fixes
    for (const fix of inlineStyleFixes) {
      const before = content;
      content = content.replace(fix.pattern, fix.replacement);
      if (content !== before) {
        modified = true;
        console.log(`  → Converted inline style to className in ${path.basename(filePath)}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let totalUpdated = 0;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      totalUpdated += processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
      if (processFile(fullPath)) {
        totalUpdated++;
      }
    }
  }

  return totalUpdated;
}

// Main execution
console.log('🔧 Applying complete dark mode fixes...\n');

const frontendDir = __dirname;
const appDir = path.join(frontendDir, 'app');
const componentsDir = path.join(frontendDir, 'components');

let total = 0;
total += processDirectory(appDir);
total += processDirectory(componentsDir);

console.log(`\n✨ Done! Fixed ${total} files.`);
