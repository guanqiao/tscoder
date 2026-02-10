const fs = require('fs');
const path = require('path');

// 修复文件中损坏的 Unicode 字符（显示为 �）
// 将常见的 Emoji 和特殊字符替换为 Unicode 转义序列

const replacements = [
  // 勾选和叉号
  { pattern: /�\?/g, replacement: '\u2713' },  // ✓
  { pattern: /�\?/g, replacement: '\u2717' },  // ✗

  // Emoji 图标 - 使用 Unicode 转义
  { pattern: /�/g, replacement: '\u{1F527}' },  // 🔧
  { pattern: /�/g, replacement: '\u{1F4C1}' },  // 📁
  { pattern: /�/g, replacement: '\u{1F50D}' },  // 🔍
  { pattern: /�/g, replacement: '\u{1F4C2}' },  // 📂
  { pattern: /�/g, replacement: '\u{1F4C4}' },  // 📄
  { pattern: /�/g, replacement: '\u{1F4DD}' },  // 📝
  { pattern: /�/g, replacement: '\u270F' },     // ✏️
  { pattern: /�/g, replacement: '\u{1F50E}' },  // 🔎
  { pattern: /�/g, replacement: '\u{1F310}' },  // 🌐
  { pattern: /�/g, replacement: '\u26A1' },     // ⚡
  { pattern: /�/g, replacement: '\u23F1' },     // ⏱
  { pattern: /�/g, replacement: '\u{1F3AF}' },  // 🎯
  { pattern: /�/g, replacement: '\u26A0' },     // ⚠️
  { pattern: /�/g, replacement: '\u25CB' },     // ○
  { pattern: /�/g, replacement: '\u25A0' },     // ■
  { pattern: /�/g, replacement: '\u2588' },     // █
  { pattern: /�/g, replacement: '\u2502' },     // │
  { pattern: /�/g, replacement: '\u250C' },     // ┌
  { pattern: /�/g, replacement: '\u2510' },     // ┐
  { pattern: /�/g, replacement: '\u2514' },     // └
  { pattern: /�/g, replacement: '\u2518' },     // ┘
  { pattern: /�/g, replacement: '\u251C' },     // ├
  { pattern: /�/g, replacement: '\u2524' },     // ┤
  { pattern: /�/g, replacement: '\u2500' },     // ─
  { pattern: /�/g, replacement: '\u252C' },     // ┬
  { pattern: /�/g, replacement: '\u2534' },     // ┴
  { pattern: /�/g, replacement: '\u253C' },     // ┼
];

function fixFile(filePath) {
  console.log(`Fixing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // 应用所有替换
  for (const { pattern, replacement } of replacements) {
    content = content.replace(pattern, replacement);
  }

  // 如果有变化，写回文件
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  Fixed!`);
    return true;
  } else {
    console.log(`  No changes needed`);
    return false;
  }
}

// 获取所有需要修复的文件
const filesToFix = process.argv.slice(2);

if (filesToFix.length === 0) {
  console.error('Usage: node fix-unicode.js <file1> [file2] ...');
  process.exit(1);
}

let fixedCount = 0;
for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    if (fixFile(file)) {
      fixedCount++;
    }
  } else {
    console.error(`File not found: ${file}`);
  }
}

console.log(`\nFixed ${fixedCount} file(s)`);
