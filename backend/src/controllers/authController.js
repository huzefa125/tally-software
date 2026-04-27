const authService = require("../services/authService");

class AuthController {
  async register(req, res, next) {
    try {
      const { email, password, name, organization } = req.body;

      const result = await authService.register(email, password, name, organization);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await authService.getUserById(req.user.id);

      res.status(200).json({
        success: true,
        message: "Profile retrieved successfully",
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await authService.updateUser(req.user.id, req.body);

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;

      await authService.changePassword(req.user.id, oldPassword, newPassword);

      res.status(200).json({
        success: true,
        message: "Password changed successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyToken(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        message: "Token is valid",
        user: req.user
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
