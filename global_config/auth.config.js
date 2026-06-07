/**
 * Accounts that must verify password on phone login (Pakistani 03XXXXXXXXX format)
 */
const PASSWORD_REQUIRED_PHONES = ["03047949332"];

const normalizePakistaniPhone = (phone) =>
  String(phone || "")
    .trim()
    .replace(/[\s-]/g, "");

const requiresPasswordLogin = (phone) =>
  PASSWORD_REQUIRED_PHONES.includes(normalizePakistaniPhone(phone));

module.exports = {
  PASSWORD_REQUIRED_PHONES,
  normalizePakistaniPhone,
  requiresPasswordLogin,
};
