# ODAK 1.0.0 — yayın kontrol listesi

Her madde gerçek cihazda (EAS `preview` derlemesi, iOS TestFlight + Android internal testing) işaretlenir. Otomatik kontrol: `npm run lint`, `npm run vendor:check`, `npm run verify:api` (yerel backend + Mailpit).

## 0. Yayın öncesi (senin adımların)
- [ ] App Store Connect: Paid Apps anlaşması/vergi/banka; abonelik grubu `ODAK Premium` → `odak_premium_monthly` (7 gün ücretsiz deneme teklifi), `odak_premium_annual`; yenilenmeyen abonelik `odak_exam_period`; fiyatlar 349 / 2490 / 1490 ₺
- [ ] Play Console: ödeme profili; abonelik `odak_premium` → temel planlar `monthly` (7 gün deneme teklifi) ve `annual`; tek seferlik ürün `odak_exam_period`
- [ ] RevenueCat: iOS+Android uygulamaları (`com.sinav.odak`), entitlement `premium`, offering paketleri `$rc_monthly`, `$rc_annual`, özel `exam_period`
- [ ] RevenueCat webhook: URL `https://odak.emrullahbozkurt.com/api/sinav-service-billing/v1/public/revenuecat/webhook`, Authorization değeri = sunucudaki `REVENUECAT_WEBHOOK_AUTH`
- [ ] Sunucu `~/services/sinav/env/.env`: `REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_SECRET_KEY` → `SKIP_GIT=1 SKIP_BUILD=1 SKIP_DB=1 SKIP_LANDING=1 bash scripts/update.sh`
- [ ] EAS: `eas init` (projectId), `EXPO_OWNER`, `EAS_PROJECT_ID`, `EXPO_PUBLIC_RC_IOS_KEY`, `EXPO_PUBLIC_RC_ANDROID_KEY`, `EXPO_PUBLIC_SENTRY_DSN` (eas.json env ya da EAS secrets)
- [ ] Marka görselleri `assets/` altına: icon.png (1024), android-icon-foreground/background/monochrome, splash-icon.png
- [ ] Sentry hesabı (DSN)
- [ ] Hukuk onaylı metinler (KVKK, gizlilik, kullanım koşulları, iptal/iade) sunucuda yayında; mağaza formları için herkese açık gizlilik + destek + hesap silme adresi

## 1. Giriş ve onboarding
- [ ] Karşılama: "Başla" misafir açar; "Hesabım var" girişe gider; koşullar/gizlilik/destek bağlantıları açılır
- [ ] Kayıt: e-posta → kod → ad + onaylar → öğrenci olur; yanlış kod, süre dolumu, tekrar gönderme sayacı
- [ ] Giriş: şifre ile / e-posta kodu ile; yanlış şifre mesajı; 5 hatada kilit mesajı
- [ ] Şifre sıfırlama: istek → kod + yeni şifre → giriş; eski oturum düşer
- [ ] Oturum bitti ekranı → yeniden giriş
- [ ] Onboarding 1: parkur seç, hedef puan (hazır + özel), nedenler, sınav tarihi (oturum / özel / belirsiz); geçmiş ve iptal oturumlar listede YOK
- [ ] Onboarding 2: müsaitlik; 3: plan önizleme; misafir kayıt ister
- [ ] Seviye tespiti: başla, soru, ara ekranı (devam / sonra devam et), çıkış (ilerleme kaydı), sonuç

## 2. Bugün / Çalış / Oturum
- [ ] Bugün: görevler başlat/ertele/atla, günü ayarla, seri, puan tahmini, tamamlanınca "Günün özeti" bandı → özet ekranı
- [ ] Çalış: genel bakış, soru tipi, beceri, karışık alıştırma sheet (kota kısaltma mesajı), yarım kalan oturum bandı → devam
- [ ] Soru oturumu: şık seç, kontrol, ipucu, çözüm, bayrak, yer imi, "Hata bildir" (tekrarda "zaten bildirdin"), öğretmene sor, duraklat → devam (409 yok), tamamla, sonuç
- [ ] Not: oku, "anladım", kontrol soruları, öğretmene sor
- [ ] Kelimeler: deste abone ol, tekrar (puanla, geri al), kelime ayrıntısı, kartlara ekle
- [ ] Hata defteri: açık / vadesi gelen / çözülen / arşiv; tür değiştir, çöz, arşivle, yeniden aç; tekrar başlat
- [ ] Yer imleri: liste, kaldır

## 3. Deneme
- [ ] Liste, kural ekranı, başlat, zamanlayıcı, cevap kaydı, şık eleme (uzun bas), işaretle, palet, duraklat/devam, teslim
- [ ] Sonuç, analiz (ücretsizde kilit → Premium), beceri çubukları, plana ekle, inceleme (yanlış/boş/doğru/işaretli), incelemeden öğretmene sor + hata bildir

## 4. Öğretmen
- [ ] Yeni sohbet, mod seç, mesaj gönder: bekleme göstergesi, 10 sn sonra bilgi, cevap gelir; geri/ileri gidip dönünce cevap kayıtlı
- [ ] Geri bildirim, rapor, durdur, kota dolu → Premium bandı; AI bilgilendirme metni görünür
- [ ] Sohbet sabitle / yeniden adlandır / sil; Ayarlar → tüm geçmişi sil
- [ ] Çeviri koçu: yön, cümle, değerlendir (uzun sürebilir), farklar, yeni cümle, kota mesajı

## 5. Ben / Ayarlar / Premium
- [ ] Ben: ilerleme, plan, ayarlar, hesap, yardım ve destek, yasal metinler (Markdown düzgün), çıkış
- [ ] Ayarlar: tema, dil, titreşim, günlük hatırlatma (izin istenir; reddedilirse bilgi), hedef sayfası (özel puan/tarih), gizlilik (pazarlama izni, geçmişi sil)
- [ ] Günlük hatırlatma: seçilen saatte yerel bildirim gelir; dokununca Bugün açılır; kapatınca gelmez; çıkış yapınca gelmez
- [ ] Hesap: ad, şifre, veri dışa aktarma, hesap silme (onay penceresi, silinme tarihi gösterilir, çıkış yapılır)
- [ ] Destek: misafir ve kayıtlı gönderebilir; gönderildi ekranı
- [ ] Premium: ücretsiz kullanıcı paketleri mağaza fiyatıyla görür; deneme rozeti yalnız hak varken; satın alma → erişim açılır; vazgeçme sessiz; ödeme beklemede bilgisi; geri yükleme; abonelik yönet; web aboneliğinde satın alma düğmesi YOK; misafir kayıt ister
- [ ] Sandbox: aylık deneme, yıllık, sınav dönemi; iptal (dönem sonuna kadar premium); yenileme; yeniden kurulum + geri yükleme; Android "beklemede"

## 6. Dayanıklılık ve erişilebilirlik
- [ ] Uçak modu: her ekranda hata + tekrar dene; deneme cevabı kaydedilemediğinde uyarı
- [ ] Bilinmeyen derin bağlantı → "bulunamadı" ekranı; kök hata ekranı (zorla hata) yeniden dener
- [ ] Koyu tema, büyük yazı boyutu (%200), ekran okuyucu etiketleri, dokunma hedefi ≥ 44
- [ ] TR ve EN dili: eksik anahtar / taşan metin yok
- [ ] Kilitli ekrandan dönüş, arka plana alıp dönme (oturum, zamanlayıcı, SSE)

## 7. Mağaza girişi
- [ ] Açıklamalar (TR/EN), anahtar kelimeler, ekran görüntüleri (iPhone 6.9" ve 6.5", Android telefon); tablet kapalı
- [ ] App Privacy / Data Safety: e-posta, ad, kullanıcı kimliği, ürün etkileşimi, AI sohbet içeriği; takip yok; veriler şifreli aktarılır; silme talebi mümkün
- [ ] İçerik derecelendirmesi; inceleme notu (demo hesap + satın alma açıklaması); hesap silme adresi (Google)
- [ ] `eas build --profile production` → `eas submit`; iOS TestFlight dış beta → inceleme; Android kapalı test → kademeli yayın %20 → %100
