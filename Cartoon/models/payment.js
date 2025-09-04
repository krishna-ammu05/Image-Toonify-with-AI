const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  orderId: String,
  paymentId: String,
  signature: String,
  amount: Number,
  plan: { type: String, enum: ["monthly", "6month", "annual"] },
  status: {
    type: String,
    enum: ["created", "success", "failed"],
    default: "created",
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);
