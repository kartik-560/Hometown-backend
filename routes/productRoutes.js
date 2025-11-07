import express from "express";
import { PrismaClient } from "@prisma/client";
import { upload, processAndUploadImages } from "../middleware/imageUpload.js";

const router = express.Router();
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      req.user = null;
      req.isAdmin = false;

      return next();
    }

    const base64Credentials = authHeader.slice(6);

    const credentials = Buffer.from(base64Credentials, "base64").toString(
      "utf8"
    );

    const [phone, password] = credentials.split(":");

    if (!phone || !password) {
      req.user = null;
      req.isAdmin = false;

      return next();
    }

    const user = await prisma.users.findUnique({
      where: { phone },
    });

    if (!user) {
      req.user = null;
      req.isAdmin = false;

      return next();
    }

    if (user.password !== password) {
      req.user = null;
      req.isAdmin = false;

      return next();
    }

    req.user = user;
    req.isAdmin = true;

    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error.message);
    console.error("Error stack:", error.stack);
    req.user = null;
    req.isAdmin = false;
    next();
  }
};

router.use(authMiddleware);

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
        status,
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const imageUrls = req.uploadedFiles?.images || [];

      // ✅ FIXED: Handle categoryIds as array from FormData
      let parsedCategoryIds = [];
      if (categoryIds) {
        // categoryIds will be an array when sent from FormData
        if (Array.isArray(categoryIds)) {
          parsedCategoryIds = categoryIds;
        } else if (typeof categoryIds === "string") {
          parsedCategoryIds = [categoryIds];
        }
      }

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

      const validStatus = status === "inactive" ? "inactive" : "active";

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
          status: validStatus,
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
// router.get("/products", async (req, res) => {
//   try {
//     let where = {};

//     if (!req.isAdmin) {
//       where.status = "active";
//     } else {
//     }

//     const products = await prisma.products.findMany({ where });

//     const activeCount = products.filter((p) => p.status === "active").length;
//     const inactiveCount = products.filter(
//       (p) => p.status === "inactive"
//     ).length;

//     res.status(200).json(products);
//   } catch (error) {
//     console.error("Error fetching products:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

router.get("/products", async (req, res) => {
  try {
    const products = await prisma.products.findMany();
    
    // Filter in JavaScript (no Prisma query)
    const filtered = products.filter(p => 
      req.isAdmin || p.status === "active" || !p.status
    );
    
    res.status(200).json(filtered);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(200).json([]);
  }
});


// Get product by ID
// router.get("/products/:id", async (req, res) => {
//   try {
//     const product = await prisma.products.findUnique({
//       where: { id: req.params.id },
//     });

//     if (!product) {
//       return res.status(404).json({ error: "Product not found" });
//     }

//     if (!req.isAdmin && product.status !== "active") {
//       return res.status(404).json({ error: "Product not found" });
//     }

//     res.status(200).json(product);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

router.get("/products/:id", async (req, res) => {
  try {
    const product = await prisma.products.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check status in JavaScript
    if (!req.isAdmin && product.status !== "active" && product.status) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put(
  "/products/:id",
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
      const { categoryIds, status, ...updateData } = req.body;

      if (!req.params.id) {
        return res.status(400).json({
          error: "Product ID is required",
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
        updateData.priceIncludesTax =
          updateData.priceIncludesTax === "true" ||
          updateData.priceIncludesTax === true;
      }
      if (updateData.shippingIncluded !== undefined) {
        updateData.shippingIncluded =
          updateData.shippingIncluded === "true" ||
          updateData.shippingIncluded === true;
      }
      if (updateData.shippingCalculatedAtCheckout !== undefined) {
        updateData.shippingCalculatedAtCheckout =
          updateData.shippingCalculatedAtCheckout === "true" ||
          updateData.shippingCalculatedAtCheckout === true;
      }
      if (updateData.storePurchaseOnly !== undefined) {
        updateData.storePurchaseOnly =
          updateData.storePurchaseOnly === "true" ||
          updateData.storePurchaseOnly === true;
      }
      if (updateData.stylePincodePrompt !== undefined) {
        updateData.stylePincodePrompt =
          updateData.stylePincodePrompt === "true" ||
          updateData.stylePincodePrompt === true;
      }

      // Process features array
      if (updateData.features) {
        if (typeof updateData.features === "string") {
          updateData.features = updateData.features
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f.length > 0);
        }
      }

      // Validate and set status
      if (status !== undefined) {
        updateData.status = status === "inactive" ? "inactive" : "active";
      }

      if (categoryIds !== undefined && categoryIds.length > 0) {
        let parsedCategoryIds = [];

        if (typeof categoryIds === "string") {
          try {
            parsedCategoryIds = JSON.parse(categoryIds);
          } catch (e) {
            parsedCategoryIds = categoryIds.split(",").map((id) => id.trim());
          }
        } else if (Array.isArray(categoryIds)) {
          parsedCategoryIds = categoryIds;
        }

        // Find existing categories
        const existingCategories = await prisma.categories.findMany({
          where: {
            id: { in: parsedCategoryIds },
          },
        });

        // ONLY use valid categories
        const validCategoryIds = existingCategories.map((c) => c.id);

        if (validCategoryIds.length === 0) {
          return res.status(400).json({
            error: "No valid categories found",
          });
        }

        updateData.categoryIds = validCategoryIds;

        // Warn if some categories were invalid
        if (validCategoryIds.length < parsedCategoryIds.length) {
          console.warn(
            `⚠️ Warning: ${
              parsedCategoryIds.length - validCategoryIds.length
            } categories not found, using only valid ones`
          );
        }
      }

      const product = await prisma.products.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        product,
        uploadedImages: newImageUrls,
        note: "Some categories were not found and were skipped",
      });
    } catch (error) {
      console.error("Product update error:", error);
      res.status(500).json({
        error: error.message,
        details: "Failed to update product",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

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
// router.get("/categories/:categoryId/products", async (req, res) => {
//   try {
//     const products = await prisma.products.findMany({
//       where: {
//         categoryIds: {
//           has: req.params.categoryId,
//         },
//       },
//     });

//     // Filter by status on application level
//     let filteredProducts = products;
    
//     if (!req.isAdmin) {
//       filteredProducts = products.filter(p => p.status === "active");
//     }

//     if (filteredProducts.length === 0) {
//       return res.status(404).json({
//         error: "No products found in this category",
//       });
//     }

//     res.status(200).json(filteredProducts);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

router.get("/categories/:categoryId/products", async (req, res) => {
  try {
    const products = await prisma.products.findMany();
    
    // Filter in JavaScript (no Prisma query)
    const filtered = products.filter(p => 
      p.categoryIds?.includes(req.params.categoryId) &&
      (req.isAdmin || p.status === "active" || !p.status)
    );

    if (filtered.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(filtered);
  } catch (error) {
    console.error("Error:", error);
    res.status(200).json([]);
  }
});


export default router;
