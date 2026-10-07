import bcrypt from "bcrypt";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

class HashUtils {
  constructor() {
    this.algorithm = "aes-256-cbc";
    this.key = Buffer.from(
      "d3ab94e330e0e124372f494cd15367c4393ba96c6e2611c9ef0236447ce7f267",
      "hex"
    );
    this.iv = crypto.randomBytes(16); // Initialization Vector
    this.SUBDIRECTORY = ".llamacui";
    this.FILENAME = "llamacui.json";
    this.HASH_FILE_PATH = path.join(
      process.env.HOME || process.env.USERPROFILE,
      this.SUBDIRECTORY,
      this.FILENAME
    );
  }

  // Hash passwords
  async cryptPassword(password) {
    return bcrypt.hash(password, 10);
  }

  // Compare hashed passwords
  async comparePassword(plainPass, hashword) {
    return bcrypt.compare(plainPass, hashword);
  }

  // Encrypt text with AES-256-CBC
  encrypt(text) {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(text, "utf-8", "hex");
    encrypted += cipher.final("hex");
    return `${this.iv.toString("hex")}:${encrypted}`;
  }

  // Decrypt text with AES-256-CBC
  decrypt(text) {
    const [ivString, encrypted] = text.split(":");
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(ivString, "hex")
    );
    let decrypted = decipher.update(encrypted, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
  }

  // Crypt username and password
  async cryptUsernamePassword(username, password) {
    const combinedString = `${username}:${password}`;
    const encrypted = this.encrypt(combinedString);
    return encrypted;
  }

  // Compare username and password with the combined hash
  async compareUsernamePassword(username, password, combinedHash) {
    const combinedString = `${username}:${password}`;
    const decrypted = this.decrypt(combinedHash);
    return combinedString === decrypted;
  }

  // Save credentials to a file
  async saveCredentialsToFile(username, password) {
    try {
      const encrypted = await this.cryptUsernamePassword(username, password);
      const data = JSON.stringify({ combinedHash: encrypted }, null, 2);

      // Ensure the subdirectory exists
      await fs.mkdir(
        path.join(process.env.HOME || process.env.USERPROFILE, this.SUBDIRECTORY),
        { recursive: true }
      );

      // Write the file to the subdirectory
      await fs.writeFile(this.HASH_FILE_PATH, data);

      console.log("Credentials saved to:", this.HASH_FILE_PATH);
    } catch (error) {
      console.error("Error saving credentials:", error.message);
    }
  }

  // Read credentials from a file
  async readCredentialsFromFile() {
    try {
      const data = await fs.readFile(this.HASH_FILE_PATH, "utf-8");
      const { combinedHash } = JSON.parse(data);
      const originalCombinedString = this.decrypt(combinedHash);
      const [username, password] = originalCombinedString.split(":");
      return { username, password };
    } catch (error) {
      // Return null if there's an error reading the file
      console.error("Error reading credentials:", error.message);
      return null;
    }
  }
}

export default HashUtils;
