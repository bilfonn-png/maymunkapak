/* MaymunKapak — settings you fill in once. Nothing here is secret: it all ships to the browser. */
const MK_CONFIG = {
  // Checkout page for Pro (Lemon Squeezy or Gumroad product link). Leave '' to hide the Buy button.
  buyUrl: '',

  // Where license keys come from: 'lemonsqueezy' or 'gumroad'.
  licenseProvider: 'lemonsqueezy',
  // Lemon Squeezy: your product id (number). Keys from other products are rejected. null = accept any key from your store.
  lemonProductId: null,
  // Gumroad: the product id shown on the product's edit page (required for Gumroad).
  gumroadProductId: '',
  // Re-check the key this often; if the server can't be reached, Pro keeps working.
  revalidateDays: 3,

  // Google OAuth client id (type "Web application") for YouTube channel mode.
  // For the extension, add https://<extension-id>.chromiumapp.org/ to its Authorized redirect URIs.
  youtubeClientId: '965421817701-u88pi510thkh3le0bqkrjvlqen2tcnbv.apps.googleusercontent.com',

  // Text drawn on free-plan thumbnails.
  watermark: 'MaymunKapak',
};
