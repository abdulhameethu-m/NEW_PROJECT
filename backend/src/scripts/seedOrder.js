require("dotenv").config();

const mongoose = require("mongoose");
const { connectDb } = require("../config/db");
const { Order } = require("../models/Order");
const { User } = require("../models/User");
const { Vendor } = require("../models/Vendor");

async function main() {
  try {
    await connectDb();
    console.log("Connected to MongoDB");

    // Find an existing user (buyer)
    let buyer = await User.findOne({ role: "user" });
    if (!buyer) {
      console.log("Creating test buyer...");
      buyer = await User.create({
        name: "Test Buyer",
        email: "buyer@test.com",
        phone: "9876543210",
        password: "Password123", // In real app this is bcrypt hashed
        role: "user",
        status: "active",
      });
      console.log("Test buyer created:", buyer._id);
    }

    // Find an existing vendor (seller)
    let vendor = await Vendor.findOne({ status: "approved" });
    if (!vendor) {
      // Create a test user for vendor
      const vendorUser = await User.create({
        name: "Test Vendor",
        email: "vendor@test.com",
        phone: "9988776655",
        password: "Password123",
        role: "vendor",
        status: "active",
      });

      vendor = await Vendor.create({
        userId: vendorUser._id,
        companyName: "Test Store",
        address: "123 Business St",
        shopName: "Test Shop",
        storeSlug: "test-shop",
        status: "approved",
        stepCompleted: 4,
      });
      console.log("Test vendor created:", vendor._id);
    }

    // Create a test order
    const order = await Order.create({
      orderNumber: `ORD-${Date.now()}-TEST`,
      userId: buyer._id,
      sellerId: vendor._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: "Test Product 1",
          price: 999,
          quantity: 2,
          image: "https://via.placeholder.com/300",
        },
        {
          productId: new mongoose.Types.ObjectId(),
          name: "Test Product 2",
          price: 499,
          quantity: 1,
          image: "https://via.placeholder.com/300",
        },
      ],
      subtotal: 2497,
      shippingFee: 50,
      taxAmount: 250,
      totalAmount: 2797,
      currency: "INR",
      status: "Delivered",
      paymentStatus: "Paid",
      paymentMethod: "ONLINE",
      deliveryStatus: "DELIVERED",
      shippingAddress: {
        fullName: "John Doe",
        phone: "9876543210",
        line1: "123 Main Street",
        line2: "Apt 4B",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
      },
      timeline: [
        { status: "Placed", note: "Order placed", changedAt: new Date() },
        { status: "Packed", note: "Order packed", changedAt: new Date(Date.now() - 2 * 86400000) },
        { status: "Shipped", note: "Order shipped", changedAt: new Date(Date.now() - 1 * 86400000) },
        { status: "Delivered", note: "Order delivered", changedAt: new Date() },
      ],
      deliveredAt: new Date(),
    });

    console.log("✅ Test order created successfully!");
    console.log("Order Details:");
    console.log("- Order ID:", order._id);
    console.log("- Order Number:", order.orderNumber);
    console.log("- Buyer:", buyer.email);
    console.log("- Seller:", vendor.shopName);
    console.log("- Total Amount: ₹", order.totalAmount);
    console.log("- Status:", order.status);

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
