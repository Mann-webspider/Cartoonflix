const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../config/auth");

const hashPassword = (plain) => bcrypt.hash(plain, 10);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

const signToken = async (payload) => {
  const secret = await getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: "7d" });
};

const verifyToken = async (token) => {
  const secret = await getJwtSecret();
  return jwt.verify(token, secret);
};

module.exports = { hashPassword, comparePassword, signToken, verifyToken };
