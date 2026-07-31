const User = require("../models/userModel");
const { hashPassword, comparePassword, signToken } = require("../utils/auth");

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
    });
    const token = await signToken({ sub: user._id.toString(), role: user.role });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !(await comparePassword(password || "", user.passwordHash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = await signToken({ sub: user._id.toString(), role: user.role });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
};
