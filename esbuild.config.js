const esbuild = require('esbuild');
const fs = require('fs');

esbuild.build({
  entryPoints: ['src/parser.js'],
  bundle: true,
  minify: true,
  outfile: 'dist/lite-spec.min.js',  // Output bundled file
  format: 'esm',  // Use ESM for modern imports
  // watch: process.argv.includes('--watch'),  // Optional: Watch mode
}).catch(() => process.exit(1));

// Code Mirror highlighter bundling and minification
esbuild.build({
  entryPoints: ['src/highlighters/litespec.mode.cm.js'],
  bundle: true,
  minify: true,
  outfile: 'dist/highlighters/litespec-mode.cm.js'
}).catch(() => process.exit(1));

// Sublime highlighter bundling and minification
fs.copyFile('src/highlighters/LiteSpec.sublime-syntax', 'dist/highlighters/LiteSpec.sublime-syntax', (err) => {
  if (err) {
    console.error('Error copying file:', err);
  } else {
    console.log('File copied successfully!');
  }
});