// server/models/Funding.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const fundingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String },
    email: { type: String },
    amount: { type: Number, required: true }, // in BDT
    currency: { type: String, default: "bdt" },
    paymentIntentId: { type: String, required: true },
    status: { type: String, default: "succeeded" },
  },
  { timestamps: true }
);

const Funding =
  mongoose.models.Funding || mongoose.model("Funding", fundingSchema);

export default Funding;
