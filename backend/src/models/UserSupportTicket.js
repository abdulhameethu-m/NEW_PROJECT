const mongoose = require("mongoose");

const USER_SUPPORT_TICKET_STATUS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const userSupportMessageSchema = new mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ["USER", "SUPPORT"],
      required: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSupportTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, trim: true, maxlength: 80 },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: USER_SUPPORT_TICKET_STATUS,
      default: "OPEN",
      index: true,
    },
    messages: {
      type: [userSupportMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

userSupportTicketSchema.index({ userId: 1, updatedAt: -1 });

module.exports = {
  UserSupportTicket: mongoose.model("UserSupportTicket", userSupportTicketSchema),
  USER_SUPPORT_TICKET_STATUS,
};
