/* MaymunKapak — settings you fill in once. Nothing here is secret: it all ships to the browser. */
const MK_CONFIG = {
  // Your Vercel deployment of this repo (serves buy.html, thanks.html and /api/*). No trailing slash.
  siteUrl: 'https://maymunkapak.vercel.app',

  // Paddle (merchant of record). Paddle → Developer tools → Authentication → Client-side token.
  paddleEnv: 'sandbox',            // 'sandbox' while testing, 'production' for real sales
  paddleClientToken: '',           // test_... or live_...
  paddlePrices: {                  // Paddle → Catalog → Products → Pro → Prices
    lifetime: '',                  // e.g. pri_01... one-time $29
    monthly: '',                   // e.g. pri_01... $5 / month (leave '' to hide)
  },

  // Re-check the key this often; if the server can't be reached, Pro keeps working.
  revalidateDays: 3,

  // Google OAuth client id (type "Web application") for YouTube channel mode.
  // For the extension, add https://<extension-id>.chromiumapp.org/ to its Authorized redirect URIs.
  youtubeClientId: '965421817701-u88pi510thkh3le0bqkrjvlqen2tcnbv.apps.googleusercontent.com',

  // Text drawn on free-plan thumbnails.
  watermark: 'MaymunKapak',
};
MK_CONFIG.buyUrl = MK_CONFIG.paddleClientToken ? MK_CONFIG.siteUrl + '/buy.html' : '';
