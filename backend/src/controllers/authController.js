import logger from "../utils/logger.js";
import httpStatusCodes from "../utils/httpStatusCodes.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import bcrypt from "bcrypt";
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
}

export default new AuthController();
