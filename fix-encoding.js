const fs = require('fs');
const path = require('path');

// 读取文件为 Buffer
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node fix-encoding.js <file>');
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);

// 尝试将 GBK 字节序列转换为 UTF-8
// 使用 iconv-lite 或其他方法
const { execSync } = require('child_process');

try {
  // 使用 PowerShell 和 .NET 进行编码转换
  const psScript = `
    $bytes = [System.IO.File]::ReadAllBytes('${filePath.replace(/'/g, "''")}');
    $gbk = [System.Text.Encoding]::GetEncoding('GBK');
    $utf8 = [System.Text.Encoding]::UTF8;
    $decoded = $gbk.GetString($bytes);
    [System.IO.File]::WriteAllText('${filePath.replace(/'/g, "''")}', $decoded, $utf8);
    Write-Host 'Conversion successful';
  `;
  execSync(`powershell -Command "${psScript.replace(/"/g, '\"')}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('Conversion failed:', e.message);
  process.exit(1);
}
