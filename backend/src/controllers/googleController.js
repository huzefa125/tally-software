const { OAuth2Client } = require("google-auth-library");
const authService = require("../services/authService");
const prisma = require("../config/prisma");

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

      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const email = payload.email;
      const name = payload.name;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Google account email is required"
        });
      }

      let user = await prisma.user.findUnique({
        where: { email },
        include: { org: true }
      });

      if (!user) {
        const organizationName = `${name || email.split("@")[0]}'s Organization`;
        const organizationSlug = authService.buildOrganizationSlug(null, organizationName);

        const result = await prisma.$transaction(async (tx) => {
          const organization = await tx.organization.create({
            data: {
              name: organizationName,
              slug: organizationSlug
            }
          });

          const createdUser = await tx.user.create({
            data: {
              email,
              name,
              password: null,
              orgId: organization.id
            }
          });

          return { organization, user: createdUser };
        });

        user = {
          ...result.user,
          org: result.organization
        };
      }

      const jwtToken = authService.generateToken(user, user.org);

      res.status(200).json({
        success: true,
        message: "Google login successful",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
            organization: user.org
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

      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const email = payload.email;
      const name = customName || payload.name;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Google account email is required"
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User already exists with this email"
        });
      }

      const organizationName = `${name || email.split("@")[0]}'s Organization`;
      const organizationSlug = authService.buildOrganizationSlug(null, organizationName);

      const result = await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: organizationName,
            slug: organizationSlug
          }
        });

        const createdUser = await tx.user.create({
          data: {
            email,
            name,
            password: null,
            orgId: organization.id
          }
        });

        return { organization, user: createdUser };
      });

      const user = {
        ...result.user,
        org: result.organization
      };

      const jwtToken = authService.generateToken(user, user.org);

      res.status(201).json({
        success: true,
        message: "Google signup successful",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
            organization: user.org
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
