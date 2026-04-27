const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { validateEmail, validatePassword, validateName, sanitizeUser } = require("../utils/validators");
const crypto = require("crypto");

class AuthService {
  async register(email, password, name, organizationInput = {}) {
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

    const organizationName = this.buildOrganizationName(name, organizationInput.name);
    const organizationSlug = this.buildOrganizationSlug(
      organizationInput.slug,
      organizationName
    );

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

    const { user, organization } = await prisma.$transaction(async (tx) => {
      const slugExists = await tx.organization.findUnique({
        where: { slug: organizationSlug }
      });

      if (organizationInput.slug && slugExists) {
        throw {
          status: 409,
          message: "Organization already exists with this slug"
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create organization first so the JWT can be org-aware from the start
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: organizationSlug
        }
      });

      // Create user inside that organization
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          orgId: organization.id
        }
      });

      return { user, organization };
    });

    // Generate token
    const token = this.generateToken(user, organization);

    return {
      user: sanitizeUser(user),
      organization,
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
      where: { email },
      include: {
        org: true
      }
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
    const token = this.generateToken(user, user.org);

    return {
      user: sanitizeUser(user),
      organization: user.org,
      token
    };
  }

  generateToken(user, organization = null) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: user.orgId || organization?.id,
        orgName: organization?.name || user.org?.name || null,
        orgSlug: organization?.slug || user.org?.slug || null
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || "7d"
      }
    );
  }

  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        org: true
      }
    });

    if (!user) {
      throw {
        status: 404,
        message: "User not found"
      };
    }

    return {
      user: sanitizeUser(user),
      organization: user.org
    };
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

  buildOrganizationName(userName, providedName) {
    const organizationName = typeof providedName === "string" ? providedName.trim() : "";
    if (organizationName) {
      return organizationName;
    }

    return `${userName.trim()}'s Organization`;
  }

  buildOrganizationSlug(explicitSlug, sourceValue) {
    if (typeof explicitSlug === "string" && explicitSlug.trim()) {
      return String(explicitSlug)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-")
        .slice(0, 100) || "organization";
    }

    const baseSlug = String(sourceValue || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-")
      .slice(0, 90) || "organization";

    const suffix = crypto.randomBytes(3).toString("hex");
    return `${baseSlug}-${suffix}`;
  }
}

module.exports = new AuthService();
