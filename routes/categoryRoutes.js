import express from "express";
import prisma from "../config/prismaConfig.js"; 

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      include: {
        categories: true,        
        other_categories: true    
      }
    });
    res.json(categories);
  } catch (error) {
    console.error("❌ Error in GET /categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", async (req, res) => {
  const { name, parent_id, comment } = req.body;

  try {
    const category = await prisma.categories.create({
      data: {
        name,
        parent_id: parent_id || null, // optional if no parent
        comment,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    console.error("❌ Error creating category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", async (req, res) => {
  const { name, parent_id, comment } = req.body;
  const categoryId = parseInt(req.params.id);

  try {
    const updatedCategory = await prisma.categories.update({
      where: { id: categoryId },
      data: {
        name,
        parent_id: parent_id || null,
        comment,
      },
    });

    res.json(updatedCategory);
  } catch (error) {
    console.error(`❌ Error updating category with ID ${categoryId}:`, error);

    if (error.code === "P2025") {
      res.status(404).json({ error: "Category not found" });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

router.delete("/:id", async (req, res) => {
  const categoryId = parseInt(req.params.id);

  try {
    await prisma.categories.delete({
      where: { id: categoryId },
    });

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error(`❌ Error deleting category with ID ${categoryId}:`, error);

    if (error.code === "P2025") {
      res.status(404).json({ error: "Category not found" });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

export default router;
