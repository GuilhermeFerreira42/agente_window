#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const base = path.resolve(process.argv[2] || '/tmp/d98-fixtures');
if (!base.startsWith('/tmp/') || base === '/tmp') {
  throw new Error(`Refusing destructive fixture root outside /tmp/: ${base}`);
}
const scmCounts = [1000, 2000, 3000, 5000, 10000];
const removeOwned = (dir) => fs.rmSync(dir, { recursive: true, force: true });
const initRepo = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('git', ['init', '-q'], { cwd: dir });
};

for (const n of scmCounts) {
  const repo = path.join(base, `scm-${n}`);
  removeOwned(repo);
  initRepo(repo);
  const changes = path.join(repo, 'changes');
  fs.mkdirSync(changes, { recursive: true });
  for (let i = 0; i < n; i++) {
    const id = String(i).padStart(5, '0');
    fs.writeFileSync(path.join(changes, `change-${id}.txt`), `D98 synthetic untracked fixture ${id}\n`);
  }
}

const explorer = path.join(base, 'explorer');
removeOwned(explorer);
initRepo(explorer);
for (const n of [1000, 5000]) {
  const children = path.join(explorer, `children-${n}`);
  fs.mkdirSync(children, { recursive: true });
  for (let i = 0; i < n; i++) {
    const id = String(i).padStart(5, '0');
    fs.writeFileSync(path.join(children, `item-${id}.txt`), `D98 Explorer ${n} child ${id}\n`);
  }
}
console.log(`Created disposable fixtures under ${base}`);
