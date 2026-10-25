import fs from 'fs';
import path from 'path';

// Minimal 1x1 valid transparent PNG buffer
const minimalPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const buf = Buffer.from(minimalPngBase64, 'base64');

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), buf);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), buf);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buf);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buf);
console.log('Icons written to /public');
