import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// Create category (with optional parentId for sub-categories)
router.post("/categories", async (req, res) => {
  try {
    const { name, parentId, comment } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Verify parent category exists if parentId is provided
    if (parentId) {
      const parentCategory = await prisma.categories.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        return res.status(400).json({ error: "Parent category not found" });
      }
    }

    const category = await prisma.categories.create({
      data: {
        name,
        parentId: parentId || null,
        comment: comment || null,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all categories (flat list) - MAIN ENDPOINT
router.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      include: {
        parent: true,
        children: true,
      },
    });

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get hierarchical categories (only root with children)
router.get("/categories/tree/hierarchy", async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      where: {
        parentId: null,
      },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
    });

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get category by ID with all sub-categories
router.get("/categories/:id", async (req, res) => {
  try {
    const category = await prisma.categories.findUnique({
      where: { id: req.params.id },
      include: {
        parent: true,
        children: {
          include: {
            children: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sub-categories of a specific parent
router.get("/categories/:parentId/subcategories", async (req, res) => {
  try {
    const subCategories = await prisma.categories.findMany({
      where: {
        parentId: req.params.parentId,
      },
      include: {
        children: true,
      },
    });

    if (subCategories.length === 0) {
      return res.status(404).json({ error: "No sub-categories found" });
    }

    res.status(200).json(subCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.put("/categories/:id", async (req, res) => {
  try {
    const { name, parentId, comment } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Verify parent category exists if parentId is being updated
    if (parentId) {
      const parentCategory = await prisma.categories.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        return res.status(400).json({ error: "Parent category not found" });
      }
    }

    const category = await prisma.categories.update({
      where: { id: req.params.id },
      data: {
        name: name || undefined,
        parentId: parentId || null,
        comment: comment || undefined,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recursive function to delete all children
async function deleteAllChildren(parentId) {
  const children = await prisma.categories.findMany({
    where: { parentId },
    include: { children: true },
  });

  for (const child of children) {
    if (child.children.length > 0) {
      await deleteAllChildren(child.id);
    }
    await prisma.categories.delete({
      where: { id: child.id },
    });
  }
}

// Delete category
router.delete("/categories/:id", async (req, res) => {
  try {
    const { deleteChildren } = req.query;

    const category = await prisma.categories.findUnique({
      where: { id: req.params.id },
      include: {
        children: true,
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (category.children.length > 0) {
      if (deleteChildren === "true") {
        await deleteAllChildren(req.params.id);

        const deletedCategory = await prisma.categories.delete({
          where: { id: req.params.id },
        });

        return res.status(200).json({
          success: true,
          message: "Category and all subcategories deleted successfully",
          deletedCategory,
        });
      } else {
        return res.status(400).json({
          error:
            "Category has subcategories. Use ?deleteChildren=true to delete all subcategories",
          subcategoriesCount: category.children.length,
        });
      }
    }

    const deletedCategory = await prisma.categories.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      deletedCategory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
