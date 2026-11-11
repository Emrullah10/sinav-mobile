#!/bin/bash
# ODAK Android yayın derlemesi (yerel): üretim prebuild → upload anahtarıyla imzalı AAB (Masaüstü).
# Anahtar: ~/.odak-android/upload.keystore + keystore.env. Gradle -Xmx6g ister (2g'de daemon ölür).
# iOS betiğiyle AYNI ANDA çalıştırma: expo prebuild birbirinin klasörünü siler.
set -e
. "$(dirname "$0")/env.sh"
set -a; . $HOME/.odak-android/keystore.env; set +a
cd "$ROOT"
echo "[android] $VERSION ($BUILD) → $EXPO_PUBLIC_API_BASE_URL"
echo "[android] prebuild"; npx expo prebuild --platform android --no-install > $LOG/android-prebuild.log 2>&1
grep -n "versionCode" android/app/build.gradle | head -1
echo "[android] gradle"
(cd android && ./gradlew :app:bundleRelease --no-daemon --max-workers=4 -Dorg.gradle.jvmargs="-Xmx6g -XX:MaxMetaspaceSize=1g" -Pandroid.injected.signing.store.file=$HOME/.odak-android/upload.keystore -Pandroid.injected.signing.store.password=$ODAK_UPLOAD_PASSWORD -Pandroid.injected.signing.key.alias=odak-upload -Pandroid.injected.signing.key.password=$ODAK_UPLOAD_PASSWORD > $LOG/android-gradle.log 2>&1) || { grep -E "FAILURE|What went wrong|error:" -A3 $LOG/android-gradle.log | head -15; exit 1; }
grep -E "BUILD (SUCCESSFUL|FAILED)" $LOG/android-gradle.log
cp android/app/build/outputs/bundle/release/app-release.aab $OUT/odak-$VERSION-v$BUILD.aab
echo "[android] AAB $OUT/odak-$VERSION-v$BUILD.aab $(ls -la $OUT/odak-$VERSION-v$BUILD.aab | awk '{print $5}') bayt"
