const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..');
const sourcePath = path.join(rootPath, 'docs', 'images');
const targetPath = path.join(rootPath, 'public', 'docs', 'images');

if (!fs.existsSync(sourcePath)) {
  process.exit(0);
}

fs.mkdirSync(targetPath, { recursive: true });
fs.cpSync(sourcePath, targetPath, { recursive: true });
console.log(`Copied docs images to ${path.relative(rootPath, targetPath)}`);
