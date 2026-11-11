# Yerel yayın derlemesi ortak ayarları (build-ios.sh / build-android.sh source eder).
# Ürün API'si: odaksinav.com.tr. Staging için: ODAK_API_BASE_URL=https://staging-odak.emrullahbozkurt.com
export APP_VARIANT=production EXPO_PUBLIC_APP_ENV=production NODE_ENV=production LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
export EXPO_PUBLIC_API_BASE_URL="${ODAK_API_BASE_URL:-https://odaksinav.com.tr}"
export EXPO_PUBLIC_RC_IOS_KEY=appl_kqmuwSGXzWixjgjFKyTNHjvjSXh EXPO_PUBLIC_RC_ANDROID_KEY=goog_VhnrrotWeGydooYgFdiqnLNxhpb
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD="$(sed -nE "s/.*buildNumber: '([0-9]+)'.*/\1/p" "$ROOT/app.config.js")"
ANDROID_CODE="$(sed -nE 's/.*versionCode: ([0-9]+),.*/\1/p' "$ROOT/app.config.js")"
[ -n "$BUILD" ] && [ "$BUILD" = "$ANDROID_CODE" ] || { echo "HATA: iOS buildNumber ($BUILD) ≠ Android versionCode ($ANDROID_CODE)" >&2; exit 1; }
VERSION="$(node -p "require('$ROOT/package.json').version")"
OUT="${ODAK_RELEASE_OUT:-$HOME/Desktop}"
LOG="${ODAK_RELEASE_LOG:-${TMPDIR:-/tmp}/odak-release-$BUILD}"; mkdir -p "$LOG"
