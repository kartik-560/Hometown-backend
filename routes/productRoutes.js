import express from "express";
import prisma from "../config/prismaConfig.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const products = await prisma.products.findMany({
      include: { categories: true },
    });
    res.json(products);
  } catch (error) {
    console.error("❌ Failed to fetch products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});


router.post("/", async (req, res) => {
  try {
    const product = await prisma.products.create({
      data: req.body,
    });
    res.status(201).json(product);
  } catch (error) {
    console.error("❌ Failed to create product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const product = await prisma.products.findUnique({
      where: { id: req.params.id },
      include: { categories: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("❌ Failed to fetch product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const product = await prisma.products.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(product);
  } catch (error) {
    console.error("❌ Failed to update product:", error);

    if (error.code === "P2025") {
      res.status(404).json({ error: "Product not found" });
    } else {
      res.status(500).json({ error: "Failed to update product" });
    }
  }
});

export default router;
