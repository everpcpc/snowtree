import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testRepoPath = path.join(__dirname, '..', '.e2e-test-repo');

console.log('[E2E Setup] Creating test repository...');
console.log('[E2E Setup] Test repo path:', testRepoPath);

if (fs.existsSync(testRepoPath)) {
  fs.rmSync(testRepoPath, { recursive: true, force: true });
}
fs.mkdirSync(testRepoPath, { recursive: true });

try {
  execSync('git init', { cwd: testRepoPath });
  execSync('git config user.name "E2E Test"', { cwd: testRepoPath });
  execSync('git config user.email "e2e@test.com"', { cwd: testRepoPath });

  const readmePath = path.join(testRepoPath, 'README.md');
  fs.writeFileSync(readmePath, '# E2E Test Repository\n\nThis is a test repository for E2E tests.\n');

  const srcDir = path.join(testRepoPath, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  const indexPath = path.join(srcDir, 'index.ts');
  fs.writeFileSync(indexPath, `export function hello() {
  return "Hello, World!";
}

export function add(a: number, b: number): number {
  return a + b;
}
`);

  const testPath = path.join(srcDir, 'test.ts');
  fs.writeFileSync(testPath, `import { hello, add } from './index';

console.log(hello());
console.log(add(1, 2));
`);

  execSync('git add .', { cwd: testRepoPath });
  execSync('git commit -m "Initial commit"', { cwd: testRepoPath });

  fs.appendFileSync(readmePath, '\n## Features\n\n- Feature 1\n- Feature 2\n');
  fs.appendFileSync(indexPath, '\nexport function subtract(a: number, b: number): number {\n  return a - b;\n}\n');

  const newFilePath = path.join(srcDir, 'utils.ts');
  fs.writeFileSync(newFilePath, `export function multiply(a: number, b: number): number {
  return a * b;
}
`);

  console.log('[E2E Setup] Git repository created');

  console.log('[E2E Setup] Setup complete!');
} catch (error) {
  console.error('[E2E Setup] Error:', error.message);
  process.exit(1);
}
