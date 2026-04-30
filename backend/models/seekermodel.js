import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const seekerSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "seeker" },
  contactNumber: { type: String, required: true }
}, { timestamps: true });

// 🔐 Hash password before saving
seekerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔑 Compare password
seekerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("Seeker", seekerSchema);