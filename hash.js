const bcrypt = require("bcrypt");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

exports.cryptPassword = function (password) {
  return bcrypt.hash(password, 10);
};

exports.comparePassword = function (plainPass, hashword) {
  return bcrypt.compare(plainPass, hashword);
};
// Use bellow to generate new code
///////////////////////////////////////////////////
// const generateKey = () => {
//   return crypto.randomBytes(32).toString("hex");
// };

// const thekey = generateKey();
// console.log("Generated Key:", thekey);
///////////////////////////////////////////////////

const algorithm = "aes-256-cbc";
const key = Buffer.from(
  "d3ab94e330e0e124372f494cd15367c4393ba96c6e2611c9ef0236447ce7f267",
  "hex"
);
const iv = crypto.randomBytes(16); // Initialization Vector
const SUBDIRECTORY = ".llamacui";
const FILENAME = "llamacui.json";
const HASH_FILE_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE,
  SUBDIRECTORY,
  FILENAME
);

const encrypt = function (text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

const decrypt = function (text) {
  const [ivString, encrypted] = text.split(":");
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(key),
    Buffer.from(ivString, "hex")
  );
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
};

exports.cryptUsernamePassword = async function (username, password) {
  const combinedString = `${username}:${password}`;
  const encrypted = encrypt(combinedString);
  return encrypted;
};

exports.compareUsernamePassword = async function (
  username,
  password,
  combinedHash
) {
  const combinedString = `${username}:${password}`;
  const decrypted = decrypt(combinedHash);
  return combinedString === decrypted;
};

exports.saveCredentialsToFile = async function (username, password) {
  try {
    const encrypted = await this.cryptUsernamePassword(username, password);
    const data = JSON.stringify({ combinedHash: encrypted }, null, 2);

    // Ensure the subdirectory exists
    await fs.mkdir(
      path.join(process.env.HOME || process.env.USERPROFILE, SUBDIRECTORY),
      { recursive: true }
    );

    // Write the file to the subdirectory
    await fs.writeFile(HASH_FILE_PATH, data);

    console.log("Credentials saved to:", HASH_FILE_PATH);
  } catch (error) {
    console.error("Error saving credentials:", error.message);
  }
};

exports.readCredentialsFromFile = async function () {
  try {
    const data = await fs.readFile(HASH_FILE_PATH, "utf-8");
    const { combinedHash } = JSON.parse(data);
    // Decrypt the combinedHash to get the original combined string
    const originalCombinedString = decrypt(combinedHash);
    // Split the combined string into username and password
    const [username, password] = originalCombinedString.split(":");
    return { username, password };
  } catch (error) {
    // Return null if there's an error reading the file
    return null;
  }
};
