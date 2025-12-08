// server/models/DonationRequest.js
import mongoose from "mongoose";

const { Schema } = mongoose;

// Subdocument for recipient information
const recipientSchema = new Schema(
  {
    name: { type: String, required: true },
    district: { type: String, required: true },
    upazila: { type: String, required: true },
  },
  { _id: false }
);

// Subdocument for requester (who created the request)
const requesterSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String },
    email: { type: String },
    district: { type: String },
    upazila: { type: String },
    bloodGroup: { type: String },
  },
  { _id: false }
);

// Subdocument for donor / volunteer who accepted the request
const donorSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String },
    email: { type: String },
    district: { type: String },
    upazila: { type: String },
    bloodGroup: { type: String },
  },
  { _id: false }
);

const donationRequestSchema = new Schema(
  {
    // Who needs the blood
    recipient: { type: recipientSchema, required: true },

    // Hospital & address
    hospitalName: { type: String, required: true },
    fullAddress: { type: String, required: true },

    // Blood info
    bloodGroup: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },

    // Donation schedule (stored as strings from the form)
    donationDate: { type: String, required: true }, // e.g. "2025-12-10"
    donationTime: { type: String, required: true }, // e.g. "14:30"

    // Extra message / story
    requestMessage: { type: String },

    // Status flow
    status: {
      type: String,
      enum: ["pending", "inprogress", "done", "canceled"],
      default: "pending",
    },

    // Who created the request (logged-in user)
    requester: { type: requesterSchema, required: true },

    // Donor / volunteer who accepted the request
    donor: { type: donorSchema, default: null },

    // Whether request is visible in public list
    isPublic: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// IMPORTANT: use existing model if it’s already compiled (prevents OverwriteModelError on hot reload)
const DonationRequest =
  mongoose.models.DonationRequest ||
  mongoose.model("DonationRequest", donationRequestSchema);

export default DonationRequest;
