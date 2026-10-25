import { execSync } from 'child_process';

try {
  console.log('> Compiling TypeScript...');
  execSync('node ./node_modules/typescript/bin/tsc', { stdio: 'inherit' });
  console.log('> Bundling with Vite...');
  execSync('node ./node_modules/vite/bin/vite.js build', { stdio: 'inherit' });
  console.log('> Build successful!');
} catch (err) {
  process.exit(1);
}
