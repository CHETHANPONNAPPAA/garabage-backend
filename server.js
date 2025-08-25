const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./schema/user");
const Request = require("./schema/request");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Admin middleware
function admin(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}

// Create request
app.post("/api/requests", auth, async (req, res) => {
  try {
    const { materialType, quantity, pickupAddress } = req.body;
    const request = new Request({
      userId: req.user.id,
      materialType,
      quantity,
      pickupAddress,
    });
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get requests (filter by userId or status)
app.get("/api/requests", auth, async (req, res) => {
  try {
    const { userId, status } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    const requests = await Request.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "name")
      .populate("updatedBy", "name");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update status
app.patch("/api/requests/:id", auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const request = await Request.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date(), updatedBy: req.user.id },
      { new: true }
    )
      .populate("userId", "name")
      .populate("updatedBy", "name");
    if (!request) return res.status(404).json({ error: "Request not found" });
    res.json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Register
app.post("/api/users/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role });
    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post("/api/users/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Invalid credentials" });
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// Get all users (admin only)
app.get("/api/users", auth, admin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

// Update user (admin only)
app.put("/api/users/:id", auth, admin, async (req, res) => {
  const { name, email, role } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, email, role },
    { new: true }
  ).select("-password");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// Delete user (admin only)
app.delete("/api/users/:id", auth, admin, async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ message: "User deleted" });
});

// Delete request
app.delete("/api/requests/:id", auth, async (req, res) => {
  const request = await Request.findByIdAndDelete(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  res.json({ message: "Request deleted" });
});

// Health check
app.get("/health", (_, res) => res.json({ ok: true }));

app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Backend running at http://localhost:${PORT}`)
);
