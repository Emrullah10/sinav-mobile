#!/bin/bash
# ODAK iOS yayın derlemesi (yerel): üretim prebuild → imzasız arşiv → Apple Distribution ile elle imza → IPA (Masaüstü).
# Xcode'da Apple hesabı yok; profil portalda elle oluşturulan 'ODAK App Store (Sign in with Apple)'.
# Android betiğiyle AYNI ANDA çalıştırma: expo prebuild birbirinin klasörünü siler.
set -e
. "$(dirname "$0")/env.sh"
cd "$ROOT"
PROF_UUID=898ac0ec-c7db-49d1-b2b2-83abf8400bc0
ID=955A5CCFF724F6200B7E90CA6C66755D891E2E2C   # Apple Distribution: EMRULLAH BOZKURT (TGD69378DX)
echo "[ios] $VERSION ($BUILD) → $EXPO_PUBLIC_API_BASE_URL"
echo "[ios] prebuild"; npx expo prebuild --platform ios --no-install > $LOG/ios-prebuild.log 2>&1
echo "[ios] pod install"; (cd ios && pod install > $LOG/ios-pods.log 2>&1)
A=$HOME/Library/Developer/Xcode/Archives/$(date +%F)/ODAK-$VERSION-b$BUILD.xcarchive; mkdir -p "$(dirname $A)"; rm -rf $A
echo "[ios] archive"; (cd ios && xcodebuild -workspace ODAK.xcworkspace -scheme ODAK -configuration Release -destination generic/platform=iOS -archivePath $A DEVELOPMENT_TEAM=TGD69378DX CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO archive > $LOG/ios-archive.log 2>&1) || { grep -E "error:" $LOG/ios-archive.log | head -5; exit 1; }
grep -q "ARCHIVE SUCCEEDED" $LOG/ios-archive.log
echo "[ios] sign"
PROF="$HOME/Library/MobileDevice/Provisioning Profiles/$PROF_UUID.mobileprovision"
W=$LOG/ipa; rm -rf $W; mkdir -p $W/Payload
cp -R $A/Products/Applications/ODAK.app $W/Payload/; APP=$W/Payload/ODAK.app
cp "$PROF" $APP/embedded.mobileprovision
security cms -D -i "$PROF" > $W/prof.plist; plutil -extract Entitlements xml1 -o $W/ent.plist $W/prof.plist
find $APP -name '_CodeSignature' -prune -o \( -name '*.framework' -o -name '*.dylib' -o -name '*.appex' \) -print | awk '{print length, $0}' | sort -rn | cut -d' ' -f2- > $W/inner.txt
while read f; do codesign -f -s $ID --timestamp=none "$f" >/dev/null 2>&1 || echo "FAIL $f"; done < $W/inner.txt
codesign -f -s $ID --entitlements $W/ent.plist --timestamp=none $APP
codesign --verify --deep --strict $APP && echo "[ios] VERIFY_OK"
[ -d $A/SwiftSupport ] && cp -R $A/SwiftSupport $W/ || true
(cd $W && zip -qry ODAK.ipa Payload $( [ -d SwiftSupport ] && echo SwiftSupport ))
cp $W/ODAK.ipa $OUT/ODAK-$VERSION-b$BUILD.ipa
echo "[ios] IPA $OUT/ODAK-$VERSION-b$BUILD.ipa $(ls -la $OUT/ODAK-$VERSION-b$BUILD.ipa | awk '{print $5}') bayt"
