import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Bump version in package.json
const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Simple patch bump: x.y.z -> x.y.(z+1)
const versionParts = pkg.version.split('.').map(Number);
versionParts[2] += 1;
const newVersion = versionParts.join('.');
pkg.version = newVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Bumped version to ${newVersion} in package.json`);

// 2. Replace __VERSION__ in src/index.ts
const indexPath = path.join(__dirname, 'dist', 'index.js');
let indexContent = fs.readFileSync(indexPath, 'utf8');

indexContent = indexContent.replace(/const VERSION = '__VERSION__';/, `const VERSION = '${newVersion}';`);

fs.writeFileSync(indexPath, indexContent);
console.log(`Replaced __VERSION__ with ${newVersion} in src/index.ts`); 