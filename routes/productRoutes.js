import express from "express";
import { PrismaClient } from "@prisma/client";
import { upload, processAndUploadImages } from "../middleware/imageUpload.js";

const router = express.Router();
const prisma = new PrismaClient();

router.post(
  "/products",
  upload.fields([{ name: "images", maxCount: 5 }]),
  processAndUploadImages([
    {
      fieldName: "images",
      folder: "products",
      maxCount: 5,
    },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        brand,
        categoryIds,
        originalPrice,
        discountedPrice,
        discountPercentage,
        priceIncludesTax,
        shippingIncluded,
        shippingCalculatedAtCheckout,
        storePurchaseOnly,
        seaterCount,
        color,
        material,
        warrantyPeriod,
        delivery,
        installation,
        stockStatus,
        note,
        productCareInstructions,
        returnAndCancellationPolicy,
        stylePincodePrompt,
        features,
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const imageUrls = req.uploadedFiles?.images || [];

      let parsedCategoryIds = [];
      if (categoryIds) {
        if (typeof categoryIds === "string") {
          parsedCategoryIds = categoryIds
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id.length > 0);
        } else if (Array.isArray(categoryIds)) {
          parsedCategoryIds = categoryIds;
        }
      }

      // ✅ CHANGED: $in to in
      if (parsedCategoryIds.length > 0) {
        const existingCategories = await prisma.categories.findMany({
          where: {
            id: { in: parsedCategoryIds },
          },
        });

        if (existingCategories.length !== parsedCategoryIds.length) {
          return res.status(400).json({
            error: "One or more categories do not exist",
            providedCount: parsedCategoryIds.length,
            foundCount: existingCategories.length,
          });
        }
      }

      let parsedFeatures = [];
      if (features) {
        if (typeof features === "string") {
          parsedFeatures = features
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f.length > 0);
        } else if (Array.isArray(features)) {
          parsedFeatures = features;
        }
      }

      const product = await prisma.products.create({
        data: {
          name,
          brand: brand || null,
          categoryIds: parsedCategoryIds,
          originalPrice: originalPrice ? Number(originalPrice) : null,
          discountedPrice: discountedPrice ? Number(discountedPrice) : null,
          discountPercentage: discountPercentage
            ? Number(discountPercentage)
            : null,
          priceIncludesTax:
            priceIncludesTax === "true" || priceIncludesTax === true,
          shippingIncluded:
            shippingIncluded === "true" || shippingIncluded === true,
          shippingCalculatedAtCheckout:
            shippingCalculatedAtCheckout === "true" ||
            shippingCalculatedAtCheckout === true,
          storePurchaseOnly:
            storePurchaseOnly === "true" || storePurchaseOnly === true,
          seaterCount: seaterCount ? Number(seaterCount) : null,
          color: color || null,
          material: material || null,
          warrantyPeriod: warrantyPeriod || null,
          delivery: delivery || null,
          installation: installation || null,
          stockStatus: stockStatus || null,
          note: note || null,
          productCareInstructions: productCareInstructions || null,
          returnAndCancellationPolicy: returnAndCancellationPolicy || null,
          stylePincodePrompt:
            stylePincodePrompt === "true" || stylePincodePrompt === true,
          imageUrls: imageUrls.length > 0 ? imageUrls : [],
          features: parsedFeatures,
        },
      });

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        product,
        uploadedImages: imageUrls,
      });
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(500).json({
        error: error.message,
        details: "Failed to create product",
      });
    }
  }
);

// Get all products
router.get("/products", async (req, res) => {
  try {
    const products = await prisma.products.findMany();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
router.get("/products/:id", async (req, res) => {
  try {
    const product = await prisma.products.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put(
  '/products/:id',
  upload.fields([{ name: 'images', maxCount: 5 }]),
  processAndUploadImages([
    {
      fieldName: 'images',
      folder: 'products',
      maxCount: 5,
    },
  ]),
  async (req, res) => {
    try {
      const { categoryIds, ...updateData } = req.body;

      console.log('Update Request Received:');
      console.log('Product ID:', req.params.id);
      console.log('Category IDs:', categoryIds);
      console.log('Update Data:', updateData);

      if (!req.params.id) {
        return res.status(400).json({
          error: 'Product ID is required',
        });
      }

      const newImageUrls = req.uploadedFiles?.images || [];
      if (newImageUrls.length > 0) {
        updateData.imageUrls = newImageUrls;
      }

      // Process numeric fields
      if (updateData.originalPrice) {
        updateData.originalPrice = Number(updateData.originalPrice);
      }
      if (updateData.discountedPrice) {
        updateData.discountedPrice = Number(updateData.discountedPrice);
      }
      if (updateData.discountPercentage) {
        updateData.discountPercentage = Number(updateData.discountPercentage);
      }
      if (updateData.seaterCount) {
        updateData.seaterCount = Number(updateData.seaterCount);
      }

      // Handle boolean fields
      if (updateData.priceIncludesTax !== undefined) {
        updateData.priceIncludesTax = updateData.priceIncludesTax === 'true' || updateData.priceIncludesTax === true;
      }
      if (updateData.shippingIncluded !== undefined) {
        updateData.shippingIncluded = updateData.shippingIncluded === 'true' || updateData.shippingIncluded === true;
      }
      if (updateData.shippingCalculatedAtCheckout !== undefined) {
        updateData.shippingCalculatedAtCheckout = updateData.shippingCalculatedAtCheckout === 'true' || updateData.shippingCalculatedAtCheckout === true;
      }
      if (updateData.storePurchaseOnly !== undefined) {
        updateData.storePurchaseOnly = updateData.storePurchaseOnly === 'true' || updateData.storePurchaseOnly === true;
      }
      if (updateData.stylePincodePrompt !== undefined) {
        updateData.stylePincodePrompt = updateData.stylePincodePrompt === 'true' || updateData.stylePincodePrompt === true;
      }

      // Process features array
      if (updateData.features) {
        if (typeof updateData.features === 'string') {
          updateData.features = updateData.features
            .split(',')
            .map(f => f.trim())
            .filter(f => f.length > 0);
        }
      }

      // ✅ FIXED: Filter valid categories instead of rejecting
      if (categoryIds !== undefined && categoryIds.length > 0) {
        let parsedCategoryIds = [];

        if (typeof categoryIds === 'string') {
          try {
            parsedCategoryIds = JSON.parse(categoryIds);
          } catch (e) {
            parsedCategoryIds = categoryIds.split(',').map(id => id.trim());
          }
        } else if (Array.isArray(categoryIds)) {
          parsedCategoryIds = categoryIds;
        }

        console.log('Parsed Category IDs:', parsedCategoryIds);

        // Find existing categories
        const existingCategories = await prisma.categories.findMany({
          where: {
            id: { in: parsedCategoryIds },
          },
        });

        console.log('Found Categories:', existingCategories.length);
        console.log('Found IDs:', existingCategories.map(c => c.id));

        // ✅ ONLY use valid categories
        const validCategoryIds = existingCategories.map(c => c.id);

        if (validCategoryIds.length === 0) {
          return res.status(400).json({
            error: 'No valid categories found',
          });
        }

        updateData.categoryIds = validCategoryIds;

        // Warn if some categories were invalid
        if (validCategoryIds.length < parsedCategoryIds.length) {
          console.warn(`⚠️ Warning: ${parsedCategoryIds.length - validCategoryIds.length} categories not found, using only valid ones`);
        }
      }

      console.log('Final Update Data:', updateData);

      const product = await prisma.products.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        product,
        uploadedImages: newImageUrls,
        note: 'Some categories were not found and were skipped',
      });
    } catch (error) {
      console.error('Product update error:', error);
      res.status(500).json({
        error: error.message,
        details: 'Failed to update product',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
);



// Add category to product
router.post(
  "/products/:productId/add-category/:categoryId",
  async (req, res) => {
    try {
      const { productId, categoryId } = req.params;

      const product = await prisma.products.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const category = await prisma.categories.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      if (product.categoryIds.includes(categoryId)) {
        return res.status(400).json({
          error: "Product already has this category",
        });
      }

      const updatedProduct = await prisma.products.update({
        where: { id: productId },
        data: {
          categoryIds: [...product.categoryIds, categoryId],
        },
      });

      res.status(200).json(updatedProduct);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Remove category from product
router.delete(
  "/products/:productId/remove-category/:categoryId",
  async (req, res) => {
    try {
      const { productId, categoryId } = req.params;

      const product = await prisma.products.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (!product.categoryIds.includes(categoryId)) {
        return res.status(400).json({
          error: "Product does not have this category",
        });
      }

      const updatedProduct = await prisma.products.update({
        where: { id: productId },
        data: {
          categoryIds: product.categoryIds.filter((id) => id !== categoryId),
        },
      });

      res.status(200).json(updatedProduct);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete product
router.delete("/products/:id", async (req, res) => {
  try {
    const product = await prisma.products.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      deletedProduct: product,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products by category
router.get("/categories/:categoryId/products", async (req, res) => {
  try {
    const products = await prisma.products.findMany({
      where: {
        categoryIds: {
          has: req.params.categoryId,
        },
      },
    });

    if (products.length === 0) {
      return res.status(404).json({
        error: "No products found in this category",
      });
    }

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
