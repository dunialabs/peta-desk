#!/usr/bin/env node

/**
 * Comprehensive dark mode implementation
 * Handles all color patterns including hex colors, rgba, and standard Tailwind classes
 */

const fs = require('fs');
const path = require('path');

// Comprehensive color mapping
const colorMappings = [
  // ========== Backgrounds ==========
  // White backgrounds
  { from: /className="([^"]*?)\bbg-white\b(?!\s+dark:)/g, to: 'className="$1bg-white dark:bg-gray-900' },

  // Gray backgrounds
  { from: /className="([^"]*?)\bbg-gray-50\b(?!\s+dark:)/g, to: 'className="$1bg-gray-50 dark:bg-gray-800' },
  { from: /className="([^"]*?)\bbg-gray-100\b(?!\s+dark:)/g, to: 'className="$1bg-gray-100 dark:bg-gray-800' },

  // Custom hex backgrounds
  { from: /className="([^"]*?)\bbg-\[#F5F5F5\]\b(?!\s+dark:)/g, to: 'className="$1bg-[#F5F5F5] dark:bg-gray-800' },
  { from: /className="([^"]*?)\bbg-\[#FAFAFA\]\b(?!\s+dark:)/g, to: 'className="$1bg-[#FAFAFA] dark:bg-gray-800' },

  // Colored backgrounds
  { from: /className="([^"]*?)\bbg-blue-50\b(?!\s+dark:)/g, to: 'className="$1bg-blue-50 dark:bg-blue-900/20' },
  { from: /className="([^"]*?)\bbg-blue-100\b(?!\s+dark:)/g, to: 'className="$1bg-blue-100 dark:bg-blue-900/30' },
  { from: /className="([^"]*?)\bbg-yellow-50\b(?!\s+dark:)/g, to: 'className="$1bg-yellow-50 dark:bg-yellow-900/20' },
  { from: /className="([^"]*?)\bbg-red-50\b(?!\s+dark:)/g, to: 'className="$1bg-red-50 dark:bg-red-900/20' },
  { from: /className="([^"]*?)\bbg-green-50\b(?!\s+dark:)/g, to: 'className="$1bg-green-50 dark:bg-green-900/20' },

  // ========== Text Colors ==========
  // Custom hex text colors
  { from: /className="([^"]*?)\btext-\[#0A0A0A\]\b(?!\s+dark:)/g, to: 'className="$1text-[#0A0A0A] dark:text-gray-100' },
  { from: /className="([^"]*?)\btext-\[#1E293B\]\b(?!\s+dark:)/g, to: 'className="$1text-[#1E293B] dark:text-gray-100' },
  { from: /className="([^"]*?)\btext-\[#26251E\]\b(?!\s+dark:)/g, to: 'className="$1text-[#26251E] dark:text-gray-100' },
  { from: /className="([^"]*?)\btext-\[#8E8E93\]\b(?!\s+dark:)/g, to: 'className="$1text-[#8E8E93] dark:text-gray-400' },
  { from: /className="([^"]*?)\btext-\[#C7C7CC\]\b(?!\s+dark:)/g, to: 'className="$1text-[#C7C7CC] dark:text-gray-500' },

  // Status colors - keep them visible in dark mode
  { from: /className="([^"]*?)\btext-\[#FF3B30\]\b(?!\s+dark:)/g, to: 'className="$1text-[#FF3B30] dark:text-red-400' },
  { from: /className="([^"]*?)\btext-\[#34C759\]\b(?!\s+dark:)/g, to: 'className="$1text-[#34C759] dark:text-green-400' },

  // Standard text colors
  { from: /className="([^"]*?)\btext-gray-500\b(?!\s+dark:)/g, to: 'className="$1text-gray-500 dark:text-gray-400' },
  { from: /className="([^"]*?)\btext-gray-600\b(?!\s+dark:)/g, to: 'className="$1text-gray-600 dark:text-gray-300' },
  { from: /className="([^"]*?)\btext-gray-700\b(?!\s+dark:)/g, to: 'className="$1text-gray-700 dark:text-gray-200' },
  { from: /className="([^"]*?)\btext-gray-900\b(?!\s+dark:)/g, to: 'className="$1text-gray-900 dark:text-gray-100' },
  { from: /className="([^"]*?)\btext-black\b(?!\s+dark:)/g, to: 'className="$1text-black dark:text-white' },

  // Colored text
  { from: /className="([^"]*?)\btext-blue-600\b(?!\s+dark:)/g, to: 'className="$1text-blue-600 dark:text-blue-400' },
  { from: /className="([^"]*?)\btext-blue-700\b(?!\s+dark:)/g, to: 'className="$1text-blue-700 dark:text-blue-300' },
  { from: /className="([^"]*?)\btext-blue-900\b(?!\s+dark:)/g, to: 'className="$1text-blue-900 dark:text-blue-100' },
  { from: /className="([^"]*?)\btext-yellow-600\b(?!\s+dark:)/g, to: 'className="$1text-yellow-600 dark:text-yellow-400' },
  { from: /className="([^"]*?)\btext-yellow-700\b(?!\s+dark:)/g, to: 'className="$1text-yellow-700 dark:text-yellow-300' },
  { from: /className="([^"]*?)\btext-yellow-900\b(?!\s+dark:)/g, to: 'className="$1text-yellow-900 dark:text-yellow-100' },
  { from: /className="([^"]*?)\btext-red-500\b(?!\s+dark:)/g, to: 'className="$1text-red-500 dark:text-red-400' },
  { from: /className="([^"]*?)\btext-green-600\b(?!\s+dark:)/g, to: 'className="$1text-green-600 dark:text-green-400' },

  // ========== Borders ==========
  // Custom hex borders
  { from: /className="([^"]*?)\bborder-\[#D1D1D6\]\b(?!\s+dark:)/g, to: 'className="$1border-[#D1D1D6] dark:border-gray-700' },

  // Standard borders
  { from: /className="([^"]*?)\bborder-gray-200\b(?!\s+dark:)/g, to: 'className="$1border-gray-200 dark:border-gray-700' },
  { from: /className="([^"]*?)\bborder-gray-300\b(?!\s+dark:)/g, to: 'className="$1border-gray-300 dark:border-gray-600' },
  { from: /className="([^"]*?)\bborder-blue-200\b(?!\s+dark:)/g, to: 'className="$1border-blue-200 dark:border-blue-800' },
  { from: /className="([^"]*?)\bborder-yellow-200\b(?!\s+dark:)/g, to: 'className="$1border-yellow-200 dark:border-yellow-800' },

  // ========== Buttons & Interactive ==========
  { from: /className="([^"]*?)\bbg-\[#26251E\]\b(?!\s+dark:)/g, to: 'className="$1bg-[#26251E] dark:bg-gray-700' },
  { from: /className="([^"]*?)\bhover:bg-\[#3A3933\]\b(?!\s+dark:)/g, to: 'className="$1hover:bg-[#3A3933] dark:hover:bg-gray-600' },
  { from: /className="([^"]*?)\bhover:bg-gray-50\b(?!\s+dark:)/g, to: 'className="$1hover:bg-gray-50 dark:hover:bg-gray-800' },
  { from: /className="([^"]*?)\bhover:bg-gray-100\b(?!\s+dark:)/g, to: 'className="$1hover:bg-gray-100 dark:hover:bg-gray-700' },

  // ========== Disabled States ==========
  { from: /className="([^"]*?)\bdisabled:bg-gray-100\b(?!\s+dark:)/g, to: 'className="$1disabled:bg-gray-100 dark:disabled:bg-gray-800' },
];

// Special patterns that need manual replacement
const manualPatterns = [
  // Border with rgba - replace with Tailwind classes
  {
    from: /border-\[rgba\(38,\s*37,\s*30,\s*0\.10?\)\]/g,
    to: 'border-gray-200 dark:border-gray-700'
  },
  {
    from: /border-\[rgba\(0,\s*0,\s*0,\s*0\.10?\)\]/g,
    to: 'border-gray-200 dark:border-gray-700'
  },
  // bg with rgba
  {
    from: /bg-\[rgba\(0,\s*0,\s*0,\s*0\.05\)\]/g,
    to: 'bg-gray-100 dark:bg-gray-800'
  },
  // Placeholder text color
  {
    from: /placeholder:text-\[#C7C7CC\](?!\s+dark:)/g,
    to: 'placeholder:text-[#C7C7CC] dark:placeholder:text-gray-500'
  },
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply manual patterns first (they might conflict with className patterns)
    for (const pattern of manualPatterns) {
      const before = content;
      content = content.replace(pattern.from, pattern.to);
      if (content !== before) {
        modified = true;
      }
    }

    // Apply className-based mappings
    for (const mapping of colorMappings) {
      const before = content;
      content = content.replace(mapping.from, mapping.to);
      if (content !== before) {
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${path.relative(process.cwd(), filePath)}`);
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
console.log('🌓 Adding comprehensive dark mode support...\n');

const frontendDir = __dirname;
const appDir = path.join(frontendDir, 'app');
const componentsDir = path.join(frontendDir, 'components');

let total = 0;
total += processDirectory(appDir);
total += processDirectory(componentsDir);

console.log(`\n✨ Done! Updated ${total} files with dark mode support.`);
