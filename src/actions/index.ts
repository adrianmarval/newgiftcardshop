// ── Auth ──────────────────────────────────────────────────────────────────────
export { login } from './auth/login';
export { logout } from './auth/logout';
export { register } from './auth/register';
export { resendVerification } from './auth/resend-verification';
export { verify2FA } from './auth/verify-2fa';
export { updateProfile } from './auth/update-profile';
export { forgotPassword } from './auth/forgot-password';
export { resetPassword } from './auth/reset-password';

// ── Catalog ────────────────────────────────────────────────────────────────────
export { getActiveBrands } from './catalog/get-active-brands';
export { getBrandById } from './catalog/get-brand-by-id';
export { getActiveCountries } from './catalog/get-active-countries';
export { getCountryById } from './catalog/get-country-by-id';
export { getBrandsByCountry } from './catalog/get-brands-by-country';
export { getBrandCountryById } from './catalog/get-brand-country-by-id';
export { getActiveBrandCountries } from './catalog/get-active-brand-countries';

// ── Giftcard ────────────────────────────────────────────────────────────────────
export { searchGiftcards } from './buyer/giftcards/search-giftcards';
export { getOrderCards } from './buyer/giftcards/get-order-cards';
export { reportIssue } from './buyer/giftcards/issues/report-issue';
export { undoIssue } from './buyer/giftcards/issues/undo-issue';
export { uploadImage } from './buyer/giftcards/ocr/upload-image';
export { extractDraft } from './buyer/giftcards/ocr/extract-draft';

// ── Order ──────────────────────────────────────────────────────────────────────
export { getUserBuyRate } from './buyer/orders/get-user-buy-rate';
export { createOrder } from './buyer/orders/create-order';
export { confirmUsage } from './buyer/orders/confirm-usage';
export { completeOrder } from './buyer/orders/complete-order';
export { cancelOrder } from './buyer/orders/cancel-order';
export { getOrderById } from './buyer/orders/get-order-by-id';
export { listOrders } from './buyer/orders/list-orders';

// ── Seller ─────────────────────────────────────────────────────────────────────
export { publishBatch, listBatches, checkCodes, recentBatches } from './seller/batches';
export { getSellerRate } from './seller/rates';
export { getSellerStats } from './seller/stats';

// ── Platform ──────────────────────────────────────────────────────────────────
export { getPlatformSetting, setPlatformSetting } from './platform/settings';

// ── Admin Payments ──────────────────────────────────────────────────────────
export { listPayments } from './admin/payments/list-payments';
export { getBuyers } from './admin/users/get-buyers';
export { getSellers } from './admin/users/get-sellers';
export { getAdmins } from './admin/users/get-admins';
export { createDeposit, createRefund } from './admin/payments';

// ── Notifications ──────────────────────────────────────────────────────────────
export { listNotifications, markAsRead, getUnreadCount, updateNotificationPreferences } from './notifications';
