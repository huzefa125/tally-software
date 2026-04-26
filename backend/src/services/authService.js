const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { validateEmail, validatePassword, validateName, sanitizeUser } = require("../utils/validators");

class AuthService {
  async register(email, password, name) {
    // Validation
    if (!validateEmail(email)) {
      throw {
        status: 400,
        message: "Invalid email format"
      };
    }

    if (!validatePassword(password)) {
      throw {
        status: 400,
        message: "Password must be at least 8 characters with uppercase, lowercase, number and special character"
      };
    }

    if (!validateName(name)) {
      throw {
        status: 400,
        message: "Name must be between 2-50 characters"
      };
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw {
        status: 409,
        message: "User already exists with this email"
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    // Generate token
    const token = this.generateToken(user);

    return {
      user: sanitizeUser(user),
      token
    };
  }

  async login(email, password) {
    // Validation
    if (!validateEmail(email)) {
      throw {
        status: 400,
        message: "Invalid email format"
      };
    }

    if (!password) {
      throw {
        status: 400,
        message: "Password is required"
      };
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw {
        status: 401,
        message: "Invalid credentials"
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw {
        status: 401,
        message: "Invalid credentials"
      };
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      user: sanitizeUser(user),
      token
    };
  }

  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || "7d"
      }
    );
  }

  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw {
        status: 404,
        message: "User not found"
      };
    }

    return sanitizeUser(user);
  }

  async updateUser(id, updates) {
    const allowedUpdates = ["name"];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (key in updates) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw {
        status: 400,
        message: "No valid fields to update"
      };
    }

    const user = await prisma.user.update({
      where: { id },
      data: filteredUpdates
    });

    return sanitizeUser(user);
  }

  async changePassword(id, oldPassword, newPassword) {
    if (!validatePassword(newPassword)) {
      throw {
        status: 400,
        message: "Password must be at least 8 characters with uppercase, lowercase, number and special character"
      };
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw {
        status: 404,
        message: "User not found"
      };
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw {
        status: 401,
        message: "Current password is incorrect"
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    return { message: "Password changed successfully" };
  }
}

module.exports = new AuthService();
