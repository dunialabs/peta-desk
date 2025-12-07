#!/usr/bin/env node

/**
 * Auto-add dark mode classes to all components
 * Usage: node add-dark-mode.js
 */

const fs = require('fs');
const path = require('path');

// Color mapping for dark mode
const colorMappings = [
  // Backgrounds
  { from: /className="([^"]*)\bbg-white\b([^"]*)"/g, to: 'className="$1bg-white dark:bg-gray-900$2"' },
  { from: /className="([^"]*)\bbg-gray-50\b([^"]*)"/g, to: 'className="$1bg-gray-50 dark:bg-gray-800$2"' },
  { from: /className="([^"]*)\bbg-gray-100\b([^"]*)"/g, to: 'className="$1bg-gray-100 dark:bg-gray-800$2"' },
  { from: /className="([^"]*)\bbg-blue-50\b([^"]*)"/g, to: 'className="$1bg-blue-50 dark:bg-blue-900\/20$2"' },
  { from: /className="([^"]*)\bbg-yellow-50\b([^"]*)"/g, to: 'className="$1bg-yellow-50 dark:bg-yellow-900\/20$2"' },
  { from: /className="([^"]*)\bbg-red-50\b([^"]*)"/g, to: 'className="$1bg-red-50 dark:bg-red-900\/20$2"' },
  { from: /className="([^"]*)\bbg-green-50\b([^"]*)"/g, to: 'className="$1bg-green-50 dark:bg-green-900\/20$2"' },

  // Text colors - custom colors
  { from: /className="([^"]*)\btext-\[#0A0A0A\]\b([^"]*)"/g, to: 'className="$1text-[#0A0A0A] dark:text-gray-100$2"' },
  { from: /className="([^"]*)\btext-\[#1E293B\]\b([^"]*)"/g, to: 'className="$1text-[#1E293B] dark:text-gray-100$2"' },
  { from: /className="([^"]*)\btext-\[#8E8E93\]\b([^"]*)"/g, to: 'className="$1text-[#8E8E93] dark:text-gray-400$2"' },
  { from: /className="([^"]*)\btext-\[#C7C7CC\]\b([^"]*)"/g, to: 'className="$1text-[#C7C7CC] dark:text-gray-500$2"' },

  // Text colors - standard
  { from: /className="([^"]*)\btext-gray-500\b([^"]*)"/g, to: 'className="$1text-gray-500 dark:text-gray-400$2"' },
  { from: /className="([^"]*)\btext-gray-600\b([^"]*)"/g, to: 'className="$1text-gray-600 dark:text-gray-300$2"' },
  { from: /className="([^"]*)\btext-gray-700\b([^"]*)"/g, to: 'className="$1text-gray-700 dark:text-gray-200$2"' },
  { from: /className="([^"]*)\btext-gray-900\b([^"]*)"/g, to: 'className="$1text-gray-900 dark:text-gray-100$2"' },
  { from: /className="([^"]*)\btext-black\b([^"]*)"/g, to: 'className="$1text-black dark:text-white$2"' },

  // Borders - custom colors
  { from: /className="([^"]*)\bborder-\[#D1D1D6\]\b([^"]*)"/g, to: 'className="$1border-[#D1D1D6] dark:border-gray-700$2"' },

  // Borders - standard
  { from: /className="([^"]*)\bborder-gray-200\b([^"]*)"/g, to: 'className="$1border-gray-200 dark:border-gray-700$2"' },
  { from: /className="([^"]*)\bborder-gray-300\b([^"]*)"/g, to: 'className="$1border-gray-300 dark:border-gray-600$2"' },
  { from: /className="([^"]*)\bborder-blue-200\b([^"]*)"/g, to: 'className="$1border-blue-200 dark:border-blue-800$2"' },
  { from: /className="([^"]*)\bborder-yellow-200\b([^"]*)"/g, to: 'className="$1border-yellow-200 dark:border-yellow-800$2"' },

  // Buttons and interactive elements
  { from: /className="([^"]*)\bbg-\[#26251E\]\b([^"]*)"/g, to: 'className="$1bg-[#26251E] dark:bg-gray-700$2"' },
  { from: /className="([^"]*)\bhover:bg-\[#3A3933\]\b([^"]*)"/g, to: 'className="$1hover:bg-[#3A3933] dark:hover:bg-gray-600$2"' },
  { from: /className="([^"]*)\bhover:bg-gray-50\b([^"]*)"/g, to: 'className="$1hover:bg-gray-50 dark:hover:bg-gray-800$2"' },
  { from: /className="([^"]*)\bbg-blue-100\b([^"]*)"/g, to: 'className="$1bg-blue-100 dark:bg-blue-900\/30$2"' },

  // Colored text
  { from: /className="([^"]*)\btext-blue-600\b([^"]*)"/g, to: 'className="$1text-blue-600 dark:text-blue-400$2"' },
  { from: /className="([^"]*)\btext-blue-700\b([^"]*)"/g, to: 'className="$1text-blue-700 dark:text-blue-300$2"' },
  { from: /className="([^"]*)\btext-blue-900\b([^"]*)"/g, to: 'className="$1text-blue-900 dark:text-blue-100$2"' },
  { from: /className="([^"]*)\btext-yellow-600\b([^"]*)"/g, to: 'className="$1text-yellow-600 dark:text-yellow-400$2"' },
  { from: /className="([^"]*)\btext-yellow-700\b([^"]*)"/g, to: 'className="$1text-yellow-700 dark:text-yellow-300$2"' },
  { from: /className="([^"]*)\btext-yellow-900\b([^"]*)"/g, to: 'className="$1text-yellow-900 dark:text-yellow-100$2"' },
  { from: /className="([^"]*)\btext-red-500\b([^"]*)"/g, to: 'className="$1text-red-500 dark:text-red-400$2"' },
  { from: /className="([^"]*)\btext-green-600\b([^"]*)"/g, to: 'className="$1text-green-600 dark:text-green-400$2"' },

  // Disabled states
  { from: /className="([^"]*)\bdisabled:bg-gray-100\b([^"]*)"/g, to: 'className="$1disabled:bg-gray-100 dark:disabled:bg-gray-800$2"' },
  { from: /className="([^"]*)\bdisabled:cursor-not-allowed\b([^"]*)"/g, to: 'className="$1disabled:cursor-not-allowed$2"' },

  // SVG stroke colors
  { from: /stroke="#040B0F"/g, to: 'stroke="currentColor" className="text-gray-900 dark:text-gray-100"' },
  { from: /stroke="#1E293B"/g, to: 'stroke="currentColor" className="text-gray-900 dark:text-gray-100"' },

  // Hover effects with rgba
  { from: /hover:bg-\[rgba\(0,0,0,0\.05\)\]/g, to: 'hover:bg-gray-100 dark:hover:bg-gray-700' },
];

// Remove duplicate dark: classes
function removeDuplicateDarkClasses(content) {
  // Match className="..." patterns
  return content.replace(/className="([^"]*)"/g, (match, classes) => {
    const classArray = classes.split(/\s+/).filter(Boolean);
    const seen = new Set();
    const unique = [];

    for (const cls of classArray) {
      // Extract base class (without dark: prefix)
      const base = cls.startsWith('dark:') ? cls.substring(5) : cls;
      const key = cls.startsWith('dark:') ? `dark:${base}` : base;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cls);
      }
    }

    return `className="${unique.join(' ')}"`;
  });
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply all color mappings
    for (const mapping of colorMappings) {
      const before = content;
      content = content.replace(mapping.from, mapping.to);
      if (content !== before) {
        modified = true;
      }
    }

    // Remove duplicate dark: classes
    if (modified) {
      content = removeDuplicateDarkClasses(content);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
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
console.log('🌓 Adding dark mode support to all components...\n');

const frontendDir = path.join(__dirname);
const appDir = path.join(frontendDir, 'app');
const componentsDir = path.join(frontendDir, 'components');

let total = 0;
total += processDirectory(appDir);
total += processDirectory(componentsDir);

console.log(`\n✨ Done! Updated ${total} files.`);
console.log('\n💡 Note: SVG elements with stroke colors have been updated to use currentColor.');
console.log('   You may need to manually adjust some SVG icons for better dark mode appearance.\n');
