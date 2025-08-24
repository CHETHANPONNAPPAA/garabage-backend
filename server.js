const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv"); // Load dotenv

dotenv.config(); // Load environment variables

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

// Schema + Model
const pickupSchema = new mongoose.Schema({
  userId: { type: String },
  materialType: {
    type: String,
    enum: ["plastic", "paper", "glass", "metal", "e-waste", "textile", "organic", "other"],
    required: true,
  },
  quantity: { type: String, required: true },
  pickupAddress: { type: String, required: true },
  status: { type: String, enum: ["pending", "scheduled", "completed"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const PickupRequest = mongoose.model("PickupRequest", pickupSchema);

// Routes
// Create request
app.post("/api/requests", async (req, res) => {
  try {
    const request = new PickupRequest(req.body);
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get requests (filter by userId or status)
app.get("/api/requests", async (req, res) => {
  try {
    const { userId, status } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    const requests = await PickupRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update status
app.patch("/api/requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const request = await PickupRequest.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json({ error: "Request not found" });
    res.json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Health check
app.get("/health", (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`🚀 Backend running at http://localhost:${PORT}`));
