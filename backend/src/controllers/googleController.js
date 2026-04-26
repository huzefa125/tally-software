const { OAuth2Client } = require("google-auth-library");
const authService = require("../services/authService");
const prisma = require("../config/prisma");

// Initialize Google OAuth Client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

class GoogleController {
  async loginWithGoogle(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Google token is required"
        });
      }

      // Verify token with Google
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name;

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Create new user from Google info
        user = await prisma.user.create({
          data: {
            email,
            name,
            password: null // Google users don't have passwords
          }
        });
      }

      // Generate JWT token
      const jwtToken = authService.generateToken(user);

      res.status(200).json({
        success: true,
        message: "Google login successful",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt
          },
          token: jwtToken
        }
      });
    } catch (error) {
      console.error("Google login error:", error);
      next({
        status: 401,
        message: "Invalid Google token or authentication failed"
      });
    }
  }

  async signupWithGoogle(req, res, next) {
    try {
      const { token, name: customName } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Google token is required"
        });
      }

      // Verify token with Google
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const googleId = payload.sub;
      const email = payload.email;
      const name = customName || payload.name;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User already exists with this email"
        });
      }

      // Create new user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: null // Google users don't have passwords
        }
      });

      // Generate JWT token
      const jwtToken = authService.generateToken(user);

      res.status(201).json({
        success: true,
        message: "Google signup successful",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt
          },
          token: jwtToken
        }
      });
    } catch (error) {
      console.error("Google signup error:", error);
      next({
        status: 401,
        message: "Invalid Google token or signup failed"
      });
    }
  }
}

module.exports = new GoogleController();
