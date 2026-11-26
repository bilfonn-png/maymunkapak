/* MaymunKapak — settings you fill in once. Nothing here is secret: it all ships to the browser. */
const MK_CONFIG = {
  // Your Vercel deployment of this repo (serves buy.html, thanks.html and /api/*). No trailing slash.
  siteUrl: 'https://maymunkapak.vercel.app',

  // Paddle (merchant of record). Paddle → Developer tools → Authentication → Client-side token (public, safe to ship).
  paddleEnv: 'sandbox',            // 'sandbox' while testing, 'production' for real sales
  paddleClientToken: 'test_b1d4f33210aed3848a017dab540',
  // Credit packs: Paddle → Catalog → "MaymunKapak Export Credits". Each price's description is "credits=N".
  packs: [
    { id: 'starter', name: 'Starter', credits: 30, priceId: 'pri_01m8bq06fmm5rnn6dngezchqz6', label: '$4.99' },
    { id: 'creator', name: 'Creator', credits: 120, priceId: 'pri_01m8bq0jk7qebb7dq8wg3r7e19', label: '$14.99' },
  ],

  // Google OAuth client id (type "Web application") for YouTube channel mode.
  // For the extension, add https://<extension-id>.chromiumapp.org/ to its Authorized redirect URIs.
  youtubeClientId: '965421817701-u88pi510thkh3le0bqkrjvlqen2tcnbv.apps.googleusercontent.com',

  // Text drawn on free-plan thumbnails.
  watermark: 'MaymunKapak',
};
MK_CONFIG.buyUrl = MK_CONFIG.paddleClientToken ? MK_CONFIG.siteUrl + '/buy.html' : '';
