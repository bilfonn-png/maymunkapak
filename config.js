/* MaymunKapak — settings you fill in once. Nothing here is secret: it all ships to the browser. */
const MK_CONFIG = {
  // Checkout page for Pro (your Gumroad product link). Leave '' to hide the Buy button.
  buyUrl: '',

  // Where license keys come from: 'gumroad' (default) or 'lemonsqueezy' (legacy only:
  // Lemon Squeezy takes no new sign-ups and shuts down on 31 March 2027).
  licenseProvider: 'gumroad',
  // Gumroad: the product id shown on the product's edit page (required).
  gumroadProductId: '',
  // Lemon Squeezy (legacy): product id (number), or null to accept any key from the store.
  lemonProductId: null,
  // Re-check the key this often; if the server can't be reached, Pro keeps working.
  revalidateDays: 3,

  // Google OAuth client id (type "Web application") for YouTube channel mode.
  // For the extension, add https://<extension-id>.chromiumapp.org/ to its Authorized redirect URIs.
  youtubeClientId: '965421817701-u88pi510thkh3le0bqkrjvlqen2tcnbv.apps.googleusercontent.com',

  // Text drawn on free-plan thumbnails.
  watermark: 'MaymunKapak',
};
