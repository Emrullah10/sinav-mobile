import { mapLegacyPath } from '@shared/navigation/legacyPaths';

// Incoming links (sinav://…, notifications, other apps) may still use the pre-2026-11-06 Turkish paths.
export function redirectSystemPath({ path }) {
  try {
    return mapLegacyPath(path);
  } catch {
    return path;
  }
}
