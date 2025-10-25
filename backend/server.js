import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";

// Routes
import providerRoutes from "./routes/providerRoutes.js";
import seekerRoutes from "./routes/seekerRoutes.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// Example route
app.get("/", (req, res) => {
  res.send("🚀 API is running successfully!");
});

// API Routes
app.use("/api/providers", providerRoutes);
app.use("/api/seekers", seekerRoutes);

// Port setup
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
