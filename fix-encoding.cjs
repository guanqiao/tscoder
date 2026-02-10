const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 读取文件为 Buffer
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node fix-encoding.cjs <file>');
  process.exit(1);
}

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
  execSync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('Conversion failed:', e.message);
  process.exit(1);
}
