import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection configuration on server startup
transporter.verify((error, success) => {
  if (error) {
    console.error("Nodemailer SMTP Connection Error:", error.message);
  } else {
    console.log("Nodemailer SMTP server ready to send emails");
  }
});

export default transporter;
