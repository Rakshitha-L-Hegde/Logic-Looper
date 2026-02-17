import SHA256 from "crypto-js/sha256";

const SECRET_KEY = "logic-looper-secret-2026"; 
// This should not be obvious in real production,
// but for demo this is fine.

export function generateSeed(dateString) {
  const hash = SHA256(dateString + SECRET_KEY).toString();

  // Convert first 8 characters of hash to number
  const seed = parseInt(hash.substring(0, 8), 16);

  return seed;
}
