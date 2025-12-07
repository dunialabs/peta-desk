#!/usr/bin/env node

/**
 * Fix SVG dark mode by moving className from path to svg element
 * Usage: node fix-svg-dark-mode.js
 */

const fs = require('fs');
const path = require('path');

function processSVG(content) {
  // Pattern: svg element followed by path with className containing dark:
  const svgPattern = /(<svg[^>]*>)\s*(<(?:g|path)[^>]*className="[^"]*\btext-gray-900 dark:text-gray-100\b[^"]*"[^>]*>)/g;

  let modified = false;
  let newContent = content;

  // Find all SVG elements with paths that have dark mode classes
  const matches = [...content.matchAll(svgPattern)];

  for (const match of matches) {
    const svgTag = match[1];
    const pathTag = match[2];

    // Check if svg already has className
    if (!svgTag.includes('className=')) {
      // Extract className from path
      const classNameMatch = pathTag.match(/className="([^"]*)"/);
      if (classNameMatch) {
        const className = classNameMatch[1];

        // Add className to svg element
        const newSvgTag = svgTag.replace('<svg', `<svg className="${className}"`);

        // Remove className from path and change stroke to currentColor
        const newPathTag = pathTag
          .replace(/className="[^"]*"/, '')
          .replace(/stroke="#[0-9A-F]+"/gi, 'stroke="currentColor"')
          .replace(/\s+/g, ' ')
          .trim();

        // Replace in content
        newContent = newContent.replace(match[0], newSvgTag + '\n' + newPathTag);
        modified = true;
      }
    }
  }

  return { content: newContent, modified };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = processSVG(content);

    if (result.modified) {
      fs.writeFileSync(filePath, result.content, 'utf8');
      console.log(`✅ Fixed SVG: ${filePath}`);
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
  let totalFixed = 0;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      totalFixed += processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
      if (processFile(fullPath)) {
        totalFixed++;
      }
    }
  }

  return totalFixed;
}

// Main execution
console.log('🔧 Fixing SVG dark mode classes...\n');

const frontendDir = path.join(__dirname);
const componentsDir = path.join(frontendDir, 'components');

let total = processDirectory(componentsDir);

console.log(`\n✨ Done! Fixed ${total} files.`);
