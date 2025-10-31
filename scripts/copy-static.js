const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const srcDir = path.join(__dirname, '..', 'src');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function copyFile(fileName) {
  const from = path.join(srcDir, fileName);
  const to = path.join(distDir, fileName);
  fs.copyFileSync(from, to);
}

copyFile('index.html');
copyFile('styles.css');

const assetsDir = path.join(srcDir, 'assets');
if (fs.existsSync(assetsDir)) {
  const targetAssets = path.join(distDir, 'assets');
  fs.rmSync(targetAssets, { recursive: true, force: true });
  fs.mkdirSync(targetAssets, { recursive: true });

  for (const file of fs.readdirSync(assetsDir)) {
    fs.copyFileSync(path.join(assetsDir, file), path.join(targetAssets, file));
  }
}
