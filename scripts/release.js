const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const { name, version } = pkg;
const distDir = path.join(__dirname, '..', 'dist');
const releaseDir = path.join(distDir, `${name}-${version}`);

if (fs.existsSync(releaseDir)) {
  console.error(`\nRelease directory already exists: ${releaseDir}`);
  console.error(`Bump the version in package.json before creating a new release.\n`);
  process.exit(1);
}

fs.mkdirSync(releaseDir, { recursive: true });

const prefix = `${name}-`;

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    // Skip existing versioned directories
    if (entry.isDirectory() && entry.name.startsWith(prefix)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(distDir, releaseDir);

console.log(`\nRelease created: dist/${name}-${version}/`);
console.log(`\nTo copy to another project:`);
console.log(`  cp -r dist/${name}-${version}/ /path/to/target/\n`);
