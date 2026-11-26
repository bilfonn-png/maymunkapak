# MaymunKapak: YouTube thumbnail maker

Type a title, get 6 ready YouTube thumbnails. Runs fully in the browser, as a website (GitHub Pages) and as a Chrome extension (side panel).

- English by default, Turkish for Turkish browsers, language switch in the top bar (`i18n.js`)
- **Free:** landscape thumbnails with a small watermark
- **Pro:** no watermark, Shorts (vertical) sizes, YouTube channel mode with one-click thumbnail upload
- Pro is sold through **Paddle** (merchant of record). After checkout, `thanks.html` shows a license key that the app checks against `/api/validate`. Settings live in `config.js`.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app (shared by the website and the extension) |
| `i18n.js` | All UI text, `en` and `tr` |
| `config.js` | Buy link, license provider, product id, Google OAuth client id, watermark |
| `license.js` | License activation, revalidation and removal (browser side) |
| `buy.html`, `thanks.html`, `terms.html` | Paddle checkout, the license key page shown after purchase, terms and refund policy |
| `api/` | Vercel functions: `claim` (turns a paid Paddle transaction into a key), `validate` (is this key's sale still paid?) |
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

## License keys (how it works)

Keys look like `MK1-<Paddle transaction id>-<signature>`. The signature is an HMAC with `LICENSE_SECRET`, so no database is needed: `/api/validate` checks the signature, then asks Paddle whether that transaction is still paid (completed, not refunded, and for subscriptions still active). If Paddle or the server is down, the app keeps Pro on. Run `npm test` for the API tests.

## Yayına alma adımları (Türkçe)

1. **Paddle hesabı:** paddle.com'da satıcı hesabı aç (önce *sandbox* hesabıyla dene). Paddle web sitesini inceler, bu yüzden site yayında olmalı ve `terms.html` ile `privacy.html` sayfaları açık olmalı. Ödeme ayarlarına banka hesabını (IBAN, USD/EUR) gir.
2. **Ürün:** Catalog → Products → *MaymunKapak Pro*. İki fiyat oluştur: ömür boyu 29 $ (tek seferlik) ve aylık 5 $. Fiyat kimliklerini (`pri_...`) not al.
3. **Vercel:** Bu repoyu Vercel'e bağla (statik sayfalar + `api/`). Environment Variables: `PADDLE_ENV`, `PADDLE_API_KEY`, `PADDLE_PRICE_IDS` (iki fiyat kimliği, virgülle), `LICENSE_SECRET` (`openssl rand -base64 32`). Örnek: `.env.example`. Paddle'da *Default payment link* olarak `https://<site>/buy.html` gir.
4. **`config.js`:** `siteUrl` (Vercel adresi), `paddleEnv`, `paddleClientToken`, `paddlePrices`.
5. **Google OAuth (kanal modu):** Google Cloud Console → OAuth istemcisi (Web application). Sitenin adresini *Authorized JavaScript origins*'e, eklenti için `https://<eklenti-id>.chromiumapp.org/` adresini *Authorized redirect URIs*'e ekle. `youtube.force-ssl` hassas bir izin olduğu için Google doğrulaması gerekir; o zamana kadar kanal modunu yalnızca test kullanıcıları kullanabilir.
6. **Paketle:** `node scripts/build-extension.mjs` (siteUrl otomatik olarak eklentinin izinlerine eklenir).
7. **Chrome Web Store:** Geliştirici hesabı (tek seferlik 5 $), zip'i yükle, gizlilik politikası olarak `https://<site>/privacy.html` adresini ver, ekran görüntüsü (1280×800) ekle.

Not: Ülke değişirse (ör. Türkiye → Kosova) Paddle'da ödeme bilgileri ve vergi bilgileri güncellenir; Paddle hesabı satıcının ülkesine göre yeniden doğrulama isteyebilir. Lisans anahtarları ve müşteriler değişmez, çünkü anahtar sunucusu sizin Vercel projenizde çalışır.
