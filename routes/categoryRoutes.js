import express from "express";
import { PrismaClient } from "@prisma/client";
import { upload, processAndUploadImages } from "../middleware/imageUpload.js";
const router = express.Router();
const prisma = new PrismaClient();

// Create category (with optional parentId for sub-categories)
// router.post("/categories", async (req, res) => {
//   try {
//     const { name, parentId, comment } = req.body;

//     if (!name) {
//       return res.status(400).json({ error: "Name is required" });
//     }

//     // Verify parent category exists if parentId is provided
//     if (parentId) {
//       const parentCategory = await prisma.categories.findUnique({
//         where: { id: parentId },
//       });

//       if (!parentCategory) {
//         return res.status(400).json({ error: "Parent category not found" });
//       }
//     }

//     const category = await prisma.categories.create({
//       data: {
//         name,
//         parentId: parentId || null,
//         comment: comment || null,
//       },
//       include: {
//         parent: true,
//         children: true,
//       },
//     });

//     res.status(201).json(category);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

router.post(
  "/categories",
  upload.fields([{ name: "image", maxCount: 1 }]), // Changed from upload.single()
  processAndUploadImages([
    {
      fieldName: "image",
      folder: "categories",
      maxCount: 1,
    },
  ]),
  async (req, res) => {
    try {
      const { name, parentId, comment } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Check if trying to upload image for subcategory
      if (parentId && req.files?.image) {
        return res.status(400).json({
          error:
            "Image upload is only allowed for parent categories, not subcategories",
        });
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

      // Get uploaded image URL (only for parent categories)
      const imageUrl = req.uploadedFiles?.image?.[0] || null;

      const category = await prisma.categories.create({
        data: {
          name,
          parentId: parentId || null,
          imageUrl: !parentId ? imageUrl : null, // Only set imageUrl if parent category
          comment: comment || null,
        },
        include: {
          parent: true,
          children: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        category,
        uploadedImage: !parentId ? imageUrl : null,
      });
    } catch (error) {
      console.error("Category creation error:", error);
      res.status(500).json({
        error: error.message,
        details: "Failed to create category",
      });
    }
  }
);

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
// router.put("/categories/:id", async (req, res) => {
//   try {
//     const { name, parentId, comment } = req.body;

//     if (!name) {
//       return res.status(400).json({ error: "Name is required" });
//     }

//     // Verify parent category exists if parentId is being updated
//     if (parentId) {
//       const parentCategory = await prisma.categories.findUnique({
//         where: { id: parentId },
//       });

//       if (!parentCategory) {
//         return res.status(400).json({ error: "Parent category not found" });
//       }
//     }

//     const category = await prisma.categories.update({
//       where: { id: req.params.id },
//       data: {
//         name: name || undefined,
//         parentId: parentId || null,
//         comment: comment || undefined,
//       },
//       include: {
//         parent: true,
//         children: true,
//       },
//     });

//     res.status(200).json(category);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

router.put(
  "/categories/:id",
  upload.fields([{ name: "image", maxCount: 1 }]), // Changed from upload.single()
  processAndUploadImages([
    {
      fieldName: "image",
      folder: "categories",
      maxCount: 1,
    },
  ]),
  async (req, res) => {
    try {
      const { name, parentId, comment } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Get existing category to check if it's a subcategory
      const existingCategory = await prisma.categories.findUnique({
        where: { id: req.params.id },
      });

      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Check if trying to upload image for subcategory
      if ((existingCategory.parentId || parentId) && req.files?.image) {
        return res.status(400).json({
          error:
            "Image upload is only allowed for parent categories, not subcategories",
        });
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

      // Get uploaded image URL
      const imageUrl = req.uploadedFiles?.image?.[0] || undefined;

      // Prepare update data
      const updateData = {
        name: name || undefined,
        parentId: parentId || null,
        comment: comment || undefined,
      };

      // Only update imageUrl for parent categories
      if (!parentId && !existingCategory.parentId) {
        updateData.imageUrl = imageUrl || existingCategory.imageUrl;
      } else if (parentId) {
        // If converting to subcategory, remove image
        updateData.imageUrl = null;
      }

      const category = await prisma.categories.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          parent: true,
          children: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Category updated successfully",
        category,
        uploadedImage: imageUrl || null,
      });
    } catch (error) {
      console.error("Category update error:", error);
      res.status(500).json({
        error: error.message,
        details: "Failed to update category",
      });
    }
  }
);

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
