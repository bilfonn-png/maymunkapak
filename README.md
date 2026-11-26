# MaymunKapak: YouTube thumbnail maker

Type a title, get 6 ready YouTube thumbnails. Runs fully in the browser, as a website (GitHub Pages) and as a Chrome extension (side panel).

- English by default, Turkish for Turkish browsers, language switch in the top bar (`i18n.js`)
- **Free:** everything (landscape, Shorts, channel mode); downloads carry a small watermark
- **Credits (pay as you go):** 1 credit = 1 watermark-free download or 1 upload to the YouTube channel. Packs: 30 credits $4.99, 120 credits $14.99, no subscription, credits never expire
- Credits are sold through **Paddle** (merchant of record). After checkout, `thanks.html` shows a credit key; the server keeps the balance. Settings live in `config.js`.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app (shared by the website and the extension) |
| `i18n.js` | All UI text, `en` and `tr` |
| `config.js` | Buy link, license provider, product id, Google OAuth client id, watermark |
| `license.js` | Credit wallet in the browser: add keys, refresh balance, spend a credit |
| `buy.html`, `thanks.html`, `terms.html` | Paddle checkout, the license key page shown after purchase, terms and refund policy |
| `api/` | Vercel functions: `claim` (paid Paddle transaction → key), `validate` (balance, re-checks refunds), `spend` (use 1 credit). Usage is counted in Upstash Redis (free tier) |
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

## Credit keys (how it works)

Keys look like `MK1-<Paddle transaction id>-<signature>`; the signature is an HMAC with `LICENSE_SECRET`. A key is worth the credits of the prices in that transaction: each price's description is `credits=N` (or `custom_data.credits`). `/api/spend` counts usage per key in Redis and refuses when the key is used up; `/api/validate` re-asks Paddle, so a refunded purchase drops to 0. Previews always carry the watermark; the clean image is rendered only after a credit is spent. Run `npm test` for the API tests.

## Yayına alma adımları (Türkçe)

1. **Paddle (sandbox hazır):** Ürün *MaymunKapak Export Credits* (`pro_01m8bpz6kqmfs3m3518ead6j7q`) ve iki fiyat oluşturuldu: 30 kredi 4,99 $ (`pri_01m8bq06fmm5rnn6dngezchqz6`), 120 kredi 14,99 $ (`pri_01m8bq0jk7qebb7dq8wg3r7e19`). Client-side token `config.js`'te. Canlıya geçerken aynısını canlı hesapta yap: fiyat açıklaması `credits=N` olmalı.
2. **Paddle API anahtarı:** Developer tools → Authentication → API keys → yeni anahtar (izin: transactions ve adjustments okuma). Bu gizli; sadece Vercel'e gir, kimseyle paylaşma.
3. **Vercel:** Repoyu Vercel'e bağla. Storage → **Upstash Redis** (ücretsiz) ekle. Environment Variables: `PADDLE_ENV=sandbox`, `PADDLE_API_KEY`, `PADDLE_PRODUCT_ID`, `LICENSE_SECRET` (`openssl rand -base64 32`). Örnek: `.env.example`. Paddle'da Checkout → *Default payment link* olarak `https://<site>/buy.html` gir; canlıda *Website approval* için siteyi onaya gönder.
4. **`config.js`:** `siteUrl`'i Vercel adresinle değiştir. Canlıya geçince `paddleEnv: 'production'`, canlı token ve canlı fiyat kimlikleri.
5. **Google OAuth (kanal modu):** Google Cloud Console → OAuth istemcisi (Web application). Sitenin adresini *Authorized JavaScript origins*'e, eklenti için `https://<eklenti-id>.chromiumapp.org/` adresini *Authorized redirect URIs*'e ekle. `youtube.force-ssl` hassas bir izin olduğu için Google doğrulaması gerekir; o zamana kadar kanal modunu yalnızca test kullanıcıları kullanabilir.
6. **Paketle:** `node scripts/build-extension.mjs` (siteUrl otomatik olarak eklentinin izinlerine eklenir).
7. **Chrome Web Store:** Geliştirici hesabı (tek seferlik 5 $), zip'i yükle, gizlilik politikası olarak `https://<site>/privacy.html` adresini ver, ekran görüntüsü (1280×800) ekle.

Not: Ülke değişirse (ör. Türkiye → Kosova) Paddle'da ödeme bilgileri ve vergi bilgileri güncellenir; Paddle hesabı satıcının ülkesine göre yeniden doğrulama isteyebilir. Kredi anahtarları ve müşteriler değişmez, çünkü anahtar sunucusu sizin Vercel projenizde çalışır.
