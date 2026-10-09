// vendor kopyalarının sapmasını denetler (PLAN-P0 §6). Sapma varsa çıkış kodu 1.
//   1) vendor dosyaları manifest'teki sha256 ile eşleşmeli (elle düzenleme yok)
//   2) kardeş ../sinav-mono-repo varsa kaynak dosyaları manifest'teki sourceSha256 ile eşleşmeli
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = path.join(ROOT, 'src/shared/vendor');
const MONO = path.resolve(ROOT, '../sinav-mono-repo');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const problems = [];

const manifestPath = path.join(VENDOR, 'manifest.json');
if (!existsSync(manifestPath)) {
  console.error('vendor/manifest.json yok — monorepoda `npm run sync:mobile` çalıştır.');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const [file, meta] of Object.entries(manifest.files)) {
  const p = path.join(VENDOR, file);
  if (!existsSync(p)) problems.push(`eksik: ${file}`);
  else if (sha(readFileSync(p)) !== meta.sha256) problems.push(`elle değiştirilmiş: ${file}`);
}
if (existsSync(MONO)) {
  for (const meta of Object.values(manifest.files)) {
    const s = path.join(MONO, meta.source);
    if (!existsSync(s)) problems.push(`kaynak silinmiş: ${meta.source}`);
    else if (sha(readFileSync(s)) !== meta.sourceSha256)
      problems.push(`kaynak değişmiş (sync gerekli): ${meta.source}`);
  }
} else {
  console.log('sinav-mono-repo kardeş klasörde yok — yalnız bütünlük denetlendi.');
}
if (problems.length) {
  console.error(
    `vendor sapması (${problems.length}):\n - ${problems.join('\n - ')}\nÇözüm: monorepoda npm run sync:mobile`,
  );
  process.exit(1);
}
console.log(
  `vendor ok (${Object.keys(manifest.files).length} dosya, monorepo ${String(manifest.monorepo?.sha).slice(0, 8)})`,
);
