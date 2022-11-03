import crypto from "node:crypto";
const ALGO = "aes-256-cbc";

export type Encrypted = { iv: string; data: string };

export function encrypt(text: string, password: string): Encrypted {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, "swankySalt", 32);
  const cipher = crypto.createCipheriv(ALGO, Buffer.from(key), iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return { iv: iv.toString("hex"), data: encrypted.toString("hex") };
}

export function decrypt(encrypted: Encrypted, password: string) {
  const iv = Buffer.from(encrypted.iv, "hex");
  const key = crypto.scryptSync(password, "swankySalt", 32);
  const encryptedText = Buffer.from(encrypted.data, "hex");
  const decipher = crypto.createDecipheriv(ALGO, Buffer.from(key), iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
}
