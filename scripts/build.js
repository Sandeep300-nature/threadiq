import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const employeeDir = path.resolve(rootDir, 'threadiq-employee-dashboard');

console.log('===> Step 1: Building Manager React frontend with Vite...');
execSync('npx vite build', { cwd: rootDir, stdio: 'inherit' });

console.log('===> Step 2: Packaging Employee frontend assets into dist/employee...');
const distEmployeeDir = path.resolve(distDir, 'employee');
if (!fs.existsSync(distEmployeeDir)) {
  fs.mkdirSync(distEmployeeDir, { recursive: true });
}

// Copy Employee index.html
const employeeHtmlContent = fs.readFileSync(path.resolve(employeeDir, 'index.html'), 'utf-8');
fs.writeFileSync(path.resolve(distEmployeeDir, 'index.html'), employeeHtmlContent);

// Also generate physical subdirectories for direct static URL resolution on Vercel
const employeeSubRoutes = ['dashboard', 'inventory', 'transfers', 'history', 'settings'];
for (const sub of employeeSubRoutes) {
  const subDir = path.resolve(distEmployeeDir, sub);
  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true });
  }
  fs.writeFileSync(path.resolve(subDir, 'index.html'), employeeHtmlContent);
}

// Ensure Manager sub-routes also have static index.html fallbacks
const managerIndexHtml = fs.readFileSync(path.resolve(distDir, 'index.html'), 'utf-8');
const managerSubRoutes = ['overview', 'inventory', 'stores', 'transfers', 'approvals', 'settings'];
const distManagerDir = path.resolve(distDir, 'manager');
if (!fs.existsSync(distManagerDir)) {
  fs.mkdirSync(distManagerDir, { recursive: true });
}
for (const sub of managerSubRoutes) {
  const subDir = path.resolve(distManagerDir, sub);
  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true });
  }
  fs.writeFileSync(path.resolve(subDir, 'index.html'), managerIndexHtml);
}

// Copy Employee css directory to dist/employee/css and dist/css (fallback)
const employeeCssSrc = path.resolve(employeeDir, 'css');
if (fs.existsSync(employeeCssSrc)) {
  fs.cpSync(employeeCssSrc, path.resolve(distEmployeeDir, 'css'), { recursive: true });
  fs.cpSync(employeeCssSrc, path.resolve(distDir, 'css'), { recursive: true });
}

// Copy Employee js directory to dist/employee/js and dist/js (fallback)
const employeeJsSrc = path.resolve(employeeDir, 'js');
if (fs.existsSync(employeeJsSrc)) {
  fs.cpSync(employeeJsSrc, path.resolve(distEmployeeDir, 'js'), { recursive: true });
  fs.cpSync(employeeJsSrc, path.resolve(distDir, 'js'), { recursive: true });
}

console.log('===> Step 3: Verification of generated distribution assets:');
console.log('  Manager index.html:           ', fs.existsSync(path.resolve(distDir, 'index.html')) ? 'OK' : 'MISSING');
console.log('  Manager assets:               ', fs.existsSync(path.resolve(distDir, 'assets')) ? 'OK' : 'MISSING');
console.log('  Employee index.html:          ', fs.existsSync(path.resolve(distEmployeeDir, 'index.html')) ? 'OK' : 'MISSING');
console.log('  Employee /dashboard route:    ', fs.existsSync(path.resolve(distEmployeeDir, 'dashboard', 'index.html')) ? 'OK' : 'MISSING');
console.log('  Employee /inventory route:    ', fs.existsSync(path.resolve(distEmployeeDir, 'inventory', 'index.html')) ? 'OK' : 'MISSING');
console.log('  Employee /transfers route:    ', fs.existsSync(path.resolve(distEmployeeDir, 'transfers', 'index.html')) ? 'OK' : 'MISSING');
console.log('  Employee css (/employee/css): ', fs.existsSync(path.resolve(distEmployeeDir, 'css')) ? 'OK' : 'MISSING');
console.log('  Employee js (/employee/js):   ', fs.existsSync(path.resolve(distEmployeeDir, 'js')) ? 'OK' : 'MISSING');
console.log('===> Build completed successfully for both Manager and Employee dashboards!');
