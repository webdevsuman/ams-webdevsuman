import logger from "../utils/logger.js";
import httpStatusCodes from "../utils/httpStatusCodes.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { generateSecurePassword } from "../utils/generatePassword.js";
import transporter from "../config/mailConfig.js";
const saltRounds = 10;

class AuthController {
  async register(req, res) {
    try {
      const { name, email } = req.body;
      if (!name || !email) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Required fields are missing.",
        });
      }

      const isUserExist = await User.findOne({ email });
      if (isUserExist) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: "User with this email already exists.",
        });
      }

      const roleName = "employee";
      const userRole = await Role.findOne({ name: roleName });
      if (!userRole) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Role not found.",
        });
      }

      const password = generateSecurePassword(5);

      const salt = await bcrypt.genSalt(saltRounds);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role: userRole._id,
      });

      await newUser.populate("role");

      await transporter.sendMail({
        from: process.env.EMAIL_FROM, // sender address
        to: newUser.email, // list of recipients
        subject: "Register successful", // subject line
        text: "", // plain text body
        html: `<h2>Account Created</h2> <p>Your password is: '${password}'. Login with this password to verify. Change password from the dashboard.`, // HTML body
      });

      return res.status(httpStatusCodes.CREATED).json({
        success: true,
        message: "User has been created. Password is sent to the email.",
        data: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role.name,
        },
      });
    } catch (error) {
      logger.error(error.message);
      res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Required fields are missing.",
        });
      }

      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(httpStatusCodes.NOT_FOUND).json({
          success: false,
          message: "User with this email not found.",
        });
      }

      const isPasswordMatch = await bcrypt.compare(
        password,
        existingUser.password,
      );
      if (!isPasswordMatch) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid Credentials",
        });
      }

      const jwtPayload = {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      };

      const accessToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      const refreshToken = jwt.sign(
        jwtPayload,
        process.env.JWT_REFRESH_SECRET,
        {
          expiresIn: "1d",
        },
      );

      if (!accessToken) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Access token not created",
        });
      } else if (!refreshToken) {
        return res.status(httpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Refresh token not created",
        });
      }

      const hashedRefreshToken = await bcrypt.hash(refreshToken, saltRounds);
      existingUser.refreshToken = hashedRefreshToken;
      await existingUser.save();

      await existingUser.populate({
        path: "role",
        populate: { path: "permissions" },
      });

      return res.status(httpStatusCodes.CREATED).json({
        success: true,
        message: "User logged in successfully",
        data: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error(error.message);
      return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const refreshToken = req.headers["refresh-token"];
      if (!refreshToken) {
        return res.status(httpStatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Refresh token not provided.",
        });
      }
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const user = await User.findById(decoded.id).populate("role");
      if (!user || !user.refreshToken) {
        return res.status(httpStatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Invalid token or session expired.",
        });
      }

      const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isMatch) {
        return res.status(httpStatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Token reused or invalid. Log in again.",
        });
      }

      const payload = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role?.name,
      };

      const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      const newRefreshToken = jwt.sign(
        payload,
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "1d" },
      );

      user.refreshToken = await bcrypt.hash(newRefreshToken, saltRounds);
      await user.save();

      return res.status(httpStatusCodes.OK).json({
        success: true,
        message: "Refresh token generated.",
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      logger.error(error.message);
      return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(httpStatusCodes.NOT_FOUND).json({
          success: false,
          message: "Email is required.",
        });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(httpStatusCodes.NOT_FOUND).json({
          success: false,
          message: "If user exists, reset link has been sent to the email.",
        });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetToken = resetToken;
      user.resetTokenExpiryTime = Date.now() + 15 * 60 * 1000;
      await user.save();

      const resetUrl = `${process.env.FRONTEND_BASE_URL}/reset-password?token=${resetToken}`;

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: email,
          subject: "Reset Password",
          html: `<p>This is your reset password link: ${resetUrl}</p>`,
        });
      } catch (mailError) {
        logger.error(mailError.message);
      }

      return res.status(httpStatusCodes.OK).json({
        success:true,
        message: "Email has been sent with the reset link."
      })
    } catch (error) {
      logger.error(error.message);
      return res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new AuthController();
