import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const e2eDir = path.join(__dirname, '../e2e');

const electronSpecs = fs.readdirSync(e2eDir)
  .filter(f => f.endsWith('.electron.spec.ts'));

console.log(`Found ${electronSpecs.length} Electron test files to fix`);

for (const specFile of electronSpecs) {
  const filePath = path.join(e2eDir, specFile);
  let content = fs.readFileSync(filePath, 'utf-8');

  const lines = content.split('\n');
  const fixedLines = [];
  let inOrphanedCode = false;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('test.describe(')) {
      braceCount = 0;
      inOrphanedCode = false;
      fixedLines.push(line);
      continue;
    }

    if (inOrphanedCode === false &&
        !trimmed.startsWith('test(') &&
        !trimmed.startsWith('test.describe(') &&
        !trimmed.startsWith('});') &&
        !trimmed === '' &&
        (trimmed.includes('const noReposText') ||
         trimmed.includes('const hasNoRepos') ||
         trimmed.includes('const firstWorktree') ||
         trimmed.includes('const firstProject') ||
         (trimmed.startsWith('if (') && trimmed.includes('hasNoRepos')) ||
         (trimmed.startsWith('if (') && trimmed.includes('worktreeExists')) ||
         trimmed.includes('waitForSelector') && !trimmed.includes('await page.waitForSelector') ||
         trimmed.includes('console.log(') ||
         trimmed.startsWith('return;') ||
         trimmed.startsWith('await firstWorktree.click()') ||
         trimmed.startsWith('await page.waitForTimeout') ||
         trimmed.includes('mainLayoutAppeared'))) {
      inOrphanedCode = true;
      braceCount = 0;
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      continue;
    }

    if (inOrphanedCode) {
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      if (braceCount === 0 && trimmed.includes('closeElectronApp')) {
        inOrphanedCode = false;
        continue;
      }

      if (braceCount < 0 || (braceCount === 0 && trimmed === '});')) {
        inOrphanedCode = false;
        continue;
      }

      continue;
    }

    if (trimmed.includes('await closeElectronApp(app);') && i > 0) {
      const prevLine = lines[i - 1].trim();
      if (prevLine.includes('await closeElectronApp(app);')) {
        continue;
      }
    }

    fixedLines.push(line);
  }

  fs.writeFileSync(filePath, fixedLines.join('\n'));
  console.log(`✓ Fixed ${specFile}`);
}

console.log('\nAll files fixed!');
