import { spawnSync } from 'node:child_process';

const windows = process.platform === 'win32';
const result = spawnSync(windows ? process.env.ComSpec : 'npm', windows
  ? ['/d', '/s', '/c', 'npm audit --omit=dev --json']
  : ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
});

if (result.error) {
  console.error('npm audit could not run.');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout || '{}');
} catch {
  console.error('npm audit did not return valid JSON.');
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};
const allowedPackages = new Set(['react-router', 'react-router-dom']);
const packages = Object.keys(vulnerabilities);
const unexpectedPackage = packages.find(name => !allowedPackages.has(name));
const router = vulnerabilities['react-router'];
const advisoryAllowed = !router || router.via?.some(item =>
  typeof item === 'object' && item.url === 'https://github.com/advisories/GHSA-qwww-vcr4-c8h2'
);

if (unexpectedPackage || !advisoryAllowed) {
  console.error(`Unexpected production dependency advisory${unexpectedPackage ? `: ${unexpectedPackage}` : ''}.`);
  process.exit(1);
}

if (packages.length) {
  console.log('Only documented non-applicable advisory GHSA-qwww-vcr4-c8h2 remains.');
} else {
  console.log('No production dependency advisories found.');
}
