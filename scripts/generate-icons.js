import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SVG_CONTENT = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="#10b981"/>
  
  <!-- Home Roof -->
  <path d="M256 100 L110 240 H160 V380 H352 V240 H402 Z" fill="#ffffff"/>
  
  <!-- Rupee Symbol -->
  <path d="M226 210 H286 V234 H250 C234 234 226 242 226 258 C226 274 234 282 250 282 H270 L230 330 H266 L306 282 V258 H286 C296 258 302 252 302 242 C302 232 296 226 286 226 V210 H306 V190 H226 V210 Z" fill="#10b981"/>
</svg>
`;

const PUBLIC_DIR = path.join(process.cwd(), 'public');

async function generateIcons() {
  const svgBuffer = Buffer.from(SVG_CONTENT);

  console.log('Generating PWA icons...');
  
  // Generate 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // Generate 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // Generate apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');
  
  console.log('Done!');
}

generateIcons().catch(console.error);
