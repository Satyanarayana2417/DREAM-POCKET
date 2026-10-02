import path from 'path';
import sharp from 'sharp';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const LOGO_PATH = path.join(PUBLIC_DIR, 'logo.png');

async function generateIcons() {
  console.log('Generating PWA icons from logo.png...');
  
  // Generate 192x192
  await sharp(LOGO_PATH)
    .resize(192, 192)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // Generate 512x512
  await sharp(LOGO_PATH)
    .resize(512, 512)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // Generate apple-touch-icon
  await sharp(LOGO_PATH)
    .resize(180, 180)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');
  
  console.log('Done!');
}

generateIcons().catch(console.error);
