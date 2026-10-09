# ODAK — sinav-mobile

Expo (managed + `expo-dev-client`, SDK 57) ile yazılmış öğrenci uygulaması. Yalnız JavaScript. Backend ve paylaşılan paketler `sinav-mono-repo`'dadır; bu repo onların **üretilmiş kopyalarını** `src/shared/vendor/` altında taşır.

## Kurulum

```bash
npm ci
cp .env.example .env          # EXPO_PUBLIC_API_BASE_URL (iOS sim: http://127.0.0.1:2000, Android emülatör: http://10.0.2.2:2000)
npx expo run:ios              # ilk yerel derleme birkaç dakika sürer
npm start                     # sonraki çalıştırmalarda yalnız Metro (dev client)
```

Gateway (`:2000`) ayakta olmalı: `curl localhost:2000/health`.

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm start` | Metro (dev client) |
| `npm run ios` / `npm run android` | Yerel derleme + çalıştırma |
| `npm run lint` | ESLint (flat config; vendor hariç) |
| `npm run format` | Prettier |
| `npm run vendor:check` | vendor bütünlüğü + kardeş monorepo ile sapma denetimi (sapmada çıkış 1) |
| `npx expo-doctor` / `npx expo install --check` | Bağımlılık ve yapılandırma denetimi |

## Vendor senkronu

Monorepo kökünde: `npm run sync:mobile` (= `node scripts/sync-mobile.mjs --target ../sinav-mobile`). Token'ları derler, `design-tokens`, `client-sdk`, `i18n`, `shared/domain` dosyalarını `src/shared/vendor/` altına başlık yorumuyla kopyalar ve `manifest.json` yazar. Vendor dosyaları **elle düzenlenmez**. Başka bir ajan/ekip yeni uç ya da çeviri ekleyince burada yeniden senkron çalıştırılır.

## Klasörler

```
app/                 expo-router rotaları (Türkçe slug'lar): (auth) (onboarding) (focus) (tabs)/{bugun,calis,deneme,ogretmen,ben}
src/api/             api = createApi(http)
src/components/      UI kiti (barrel: @components)
src/features/<alan>/ özellik kodu
src/hooks/           useHaptics, useReducedMotion
src/shared/          auth, http, theme, translation, navigation, providers, constant, vendor
src/store/           zustand: theme, ui, onboarding (kalıcı); auth: shared/auth/authStore
```

Alias'lar: `@components @features @shared @store @hooks @api @theme` (babel + jsconfig).

Ayrıntı: `CLAUDE.md` (kurallar), `docs/DECISIONS.md` (kararlar).
