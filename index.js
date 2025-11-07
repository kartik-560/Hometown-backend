import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import { processAndUploadImages, upload } from "./middleware/imageUpload.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Image upload route
// app.use(
//   "/imageUpload",
//   upload.fields([{ name: "images", maxCount: 5 }]),
//   processAndUploadImages([
//     {
//       fieldName: "images",
//       folder: "image-upload",
//       maxCount: 5,
//     },
//   ]),
//   async (req, res) => {
//     console.log("req.uploadedFiles:", req.uploadedFiles);
//     res.status(201).json({
//       success: true,
//       message: "Image uploaded successfully",
//       uploadedFiles: req.uploadedFiles,
//     });
//   }
// );

// API routes
app.use("/api", userRoutes);
app.use("/api", categoryRoutes);
app.use("/api", productRoutes);

// ✅ Default route
app.get("/", (req, res) => {
  res.send("Backend running on Vercel");
});


export default app;
