import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check basic auth
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    // Decode base64 credentials
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [phone, password] = credentials.split(':');

    if (!phone || !password) {
      return res.status(401).json({ error: 'Invalid credentials format' });
    }

    // Find user by phone
    const user = await prisma.users.findUnique({
      where: { phone },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Compare passwords directly (no hashing)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register user
router.post('/users/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone, and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this phone already exists' });
    }

    // Create user (password stored as plain text)
    const user = await prisma.users.create({
      data: {
        name,
        phone,
        password,
      },
    });

    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login user (basic auth)
router.post('/users/login', authMiddleware, async (req, res) => {
  try {
    res.status(200).json({ 
      message: 'Login successful',
      user: {
        id: req.user.id,
        name: req.user.name,
        phone: req.user.phone,
        createdAt: req.user.createdAt,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (protected route)
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/users/profile/me', authMiddleware, async (req, res) => {
  try {
    res.status(200).json({
      id: req.user.id,
      name: req.user.name,
      phone: req.user.phone,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID (protected route)
router.get('/users/:id', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (protected route)
router.put('/users/:id', authMiddleware, async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const updateData = {};

    // Only allow users to update their own profile
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    if (name) updateData.name = name;
    if (phone) {
      // Check if new phone already exists
      const existingUser = await prisma.users.findUnique({
        where: { phone },
      });

      if (existingUser && existingUser.id !== req.params.id) {
        return res.status(400).json({ error: 'Phone number already in use' });
      }

      updateData.phone = phone;
    }
    if (password) {
      updateData.password = password;  // Store plain text password
    }

    const user = await prisma.users.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ 
      message: 'User updated successfully',
      user 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (protected route)
router.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    // Only allow users to delete their own account
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own account' });
    }

    const user = await prisma.users.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: user.id,
        phone: user.phone,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
