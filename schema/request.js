const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  materialType: {
    type: String,
    enum: [
      "plastic",
      "paper",
      "glass",
      "metal",
      "e-waste",
      "textile",
      "organic",
      "other",
    ],
    required: true,
  },
  quantity: { type: String, required: true },
  pickupAddress: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "scheduled", "completed"],
    default: "pending",
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Request", requestSchema);
