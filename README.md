# MaymunKapak: YouTube thumbnail maker

Type a title, get 6 ready YouTube thumbnails. Runs fully in the browser, as a website (GitHub Pages) and as a Chrome extension (side panel).

- English by default, Turkish for Turkish browsers, language switch in the top bar (`i18n.js`)
- **Free:** landscape thumbnails with a small watermark
- **Pro:** no watermark, Shorts (vertical) sizes, YouTube channel mode with one-click thumbnail upload
- Pro is unlocked with a **Lemon Squeezy** or **Gumroad** license key (`license.js`), and settings live in `config.js`

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app (shared by the website and the extension) |
| `i18n.js` | All UI text, `en` and `tr` |
| `config.js` | Buy link, license provider, product id, Google OAuth client id, watermark |
| `license.js` | License activation, revalidation and removal |
| `fonts/`, `fonts.css` | Bundled fonts (SIL OFL), so the extension loads nothing remote |
| `extension/` | Manifest V3, side panel service worker, store name/description in `_locales` |
| `privacy.html` | Privacy policy (the Chrome Web Store asks for its URL) |
| `scripts/build-extension.mjs` | Builds `dist/extension/` and the zip for the store |

## Build the extension

```bash
node scripts/build-extension.mjs
# → dist/maymunkapak-extension-1.0.0.zip
```

Try it locally: `chrome://extensions` → Developer mode → **Load unpacked** → choose `dist/extension`. Click the toolbar icon and MaymunKapak opens in the side panel.

Differences in the extension: the person cut-out (background removal) loads a remote AI model, which the Chrome Web Store does not allow, so in the extension the photo is used as the background. The website keeps the cut-out. YouTube sign-in uses `chrome.identity` instead of Google's remote script.

## Yayına alma adımları (Türkçe)

1. **Ödeme hesabı:** Lemon Squeezy'de (veya Gumroad'da) mağaza aç. Türkiye'den satıcı kabulünü ve ödeme yöntemini başvuruda teyit et. Bir ürün oluştur, **License keys** seçeneğini aç (cihaz limiti: 3 önerilir). Öneri: ömür boyu 29 $, ayrıca aylık 5 $.
2. **`config.js`'i doldur:** `buyUrl` (ürünün ödeme linki), `lemonProductId` (ürün numarası). Gumroad kullanırsan `licenseProvider: 'gumroad'` ve `gumroadProductId`.
3. **Google OAuth (kanal modu için):** Google Cloud Console → OAuth istemcisi (Web application). Web sitesinin adresini *Authorized JavaScript origins*'e, eklenti için `https://<eklenti-id>.chromiumapp.org/` adresini *Authorized redirect URIs*'e ekle. Eklenti kimliği Chrome Web Store'a ilk yüklemeden sonra sabitlenir. `youtube.force-ssl` hassas bir izin olduğu için Google doğrulaması gerekir; doğrulama bitene kadar kanal modu yalnızca test kullanıcılarına açık kalır. Kendin Yap modu bundan etkilenmez.
4. **Paketle:** `node scripts/build-extension.mjs`.
5. **Chrome Web Store:** Geliştirici hesabı aç (tek seferlik 5 $). Zip'i yükle, gizlilik politikası olarak `privacy.html`'in yayındaki adresini ver, en az 1 ekran görüntüsü (1280×800) ve kısa tanıtım ekle. Kategori: *Tools* veya *Photos*.
6. **Web sitesi:** GitHub Pages'te `index.html` zaten yayında. Ana sayfaya Chrome Web Store linkini ekle.
