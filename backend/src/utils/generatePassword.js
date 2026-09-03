import crypto from "crypto";

export const generateSecurePassword = (length = 6) => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";

  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one character from each required set
  const required = [
    uppercase[crypto.randomInt(0, uppercase.length)],
    lowercase[crypto.randomInt(0, lowercase.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    special[crypto.randomInt(0, special.length)],
  ];

  // Fill remaining characters from the combined pool
  for (let i = required.length; i < length; i++) {
    required.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Cryptographically shuffle array using Fisher-Yates
  for (let i = required.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join("");
};
