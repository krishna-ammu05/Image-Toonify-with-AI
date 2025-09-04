const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const razorpay = require("../utils/razorpay.js"); // instance with key/secret
const Payment = require("../models/payment");
const User = require("../models/users");

// helper function to calculate expiry
function getExpiryDate(plan) {
  const now = new Date();
  if (plan === "monthly") now.setMonth(now.getMonth() + 1);
  if (plan === "6month") now.setMonth(now.getMonth() + 6);
  if (plan === "annual") now.setFullYear(now.getFullYear() + 1);
  return now;
}

// 1️⃣ Create Order
router.post("/create-order", async (req, res) => {
  try {
    const { amount, plan } = req.body;

    const options = {
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: "order_rcptid_" + Date.now(),
      notes: { plan }, // 🟢 store plan in order
    };

    const order = await razorpay.orders.create(options);

    // Save to DB
    const payment = new Payment({
      orderId: order.id,
      amount,
      plan,
      status: "created",
      user: req.user ? req.user._id : null,
    });

    await payment.save();

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating order");
  }
});

// 2️⃣ Verify Payment
router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature === razorpay_signature) {
      // ✅ Mark payment success
      const payment = await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        {
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          status: "success",
        },
        { new: true }
      );

      // Update user subscription
      if (payment && payment.user) {
        const user = await User.findById(payment.user);
        if (user) {
          const expiry = getExpiryDate(payment.plan);
          user.plan =
            payment.plan === "monthly"
              ? "Monthly"
              : payment.plan === "6month"
              ? "6Month"
              : "Annual";
          user.subscriptionStart = new Date();
          user.subscriptionEnd = expiry;
          await user.save();
        }
      }

      // 🟢 Instead of JSON, redirect to dashboard
      return res.redirect(`/${user.username}/dashboard`);
    } else {
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: "failed" }
      );
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Verification error" });
  }
});

module.exports = router;
