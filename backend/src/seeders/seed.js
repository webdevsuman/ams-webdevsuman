import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dbConnect from "../config/dbConnect.js";
import logger from "../utils/logger.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import Permission from "../models/permissions.model.js";
import ROLES from "../constants/roles.constant.js";
import PERMISSIONS from "../constants/permissions.constant.js";

const flattenPermissions = (permissionsObj) => {
  const result = [];
  for (const group of Object.values(permissionsObj)) {
    for (const action of Object.values(group)) {
      result.push({
        name: action,
        description: `Permission to perform ${action.replace(":", " ")}`,
      });
    }
  }
  return result;
};

const seedRolesAndPermissions = async () => {
  try {
    logger.info("Connecting to database for seeding...");
    await dbConnect();

    logger.info("Seeding permissions...");
    const allPermissions = flattenPermissions(PERMISSIONS);

    // Upsert permissions
    for (const perm of allPermissions) {
      await Permission.updateOne(
        { name: perm.name },
        { $set: { name: perm.name, description: perm.description } },
        { upsert: true }
      );
    }

    const savedPermissions = await Permission.find();
    const permissionMap = new Map(
      savedPermissions.map((p) => [p.name, p._id])
    );

    const getPermissionIds = (permissionNames) =>
      permissionNames
        .map((name) => permissionMap.get(name))
        .filter(Boolean);

    logger.info("Seeding roles...");
    const rolePermissionMapping = {
      [ROLES.SUPER_ADMIN]: savedPermissions.map((p) => p._id),
      [ROLES.SUB_ADMIN]: getPermissionIds([
        PERMISSIONS.USER.CREATE,
        PERMISSIONS.USER.READ,
        PERMISSIONS.USER.UPDATE,
        PERMISSIONS.USER.ASSIGN_ROLE,
        PERMISSIONS.ROLE.READ,
        PERMISSIONS.ROLE.ASSIGN_PERMISSION,
        PERMISSIONS.TASK.CREATE,
        PERMISSIONS.TASK.ASSIGN,
        PERMISSIONS.TASK.READ_ALL,
        PERMISSIONS.TASK.READ_OWN,
        PERMISSIONS.TASK.UPDATE_ANY,
        PERMISSIONS.TASK.UPDATE_OWN,
        PERMISSIONS.TASK.DELETE,
        PERMISSIONS.REPORT.VIEW,
      ]),
      [ROLES.MANAGER]: getPermissionIds([
        PERMISSIONS.USER.READ,
        PERMISSIONS.TASK.CREATE,
        PERMISSIONS.TASK.ASSIGN,
        PERMISSIONS.TASK.READ_ALL,
        PERMISSIONS.TASK.UPDATE_ANY,
        PERMISSIONS.REPORT.VIEW,
      ]),
      [ROLES.EMPLOYEE]: getPermissionIds([
        PERMISSIONS.TASK.READ_OWN,
        PERMISSIONS.TASK.UPDATE_OWN,
      ]),
    };

    // Upsert roles
    for (const [roleName, permissions] of Object.entries(rolePermissionMapping)) {
      await Role.updateOne(
        { name: roleName },
        { $set: { name: roleName, permissions } },
        { upsert: true }
      );
      logger.info(`Role '${roleName}' configured with ${permissions.length} permissions.`);
    }

    // Seed default Super Admin User
    logger.info("Checking default Super Admin user...");
    const superAdminRole = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const existingSuperAdmin = await User.findOne({ email: superAdminEmail });

    if (!existingSuperAdmin) {
      const defaultPassword = process.env.SUPER_ADMIN_PASSWORD;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);

      await User.create({
        name: "Super Admin",
        email: superAdminEmail,
        password: hashedPassword,
        role: superAdminRole._id,
      });
      logger.info(`Default Super Admin user created with email: ${superAdminEmail}`);
    } else {
      logger.info(`Super Admin user already exists with email: ${superAdminEmail}`);
    }

    logger.info("Seeding completed successfully!");
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
  } finally {
    await mongoose.connection.close();
    logger.info("Database connection closed.");
    process.exit(0);
  }
};

seedRolesAndPermissions();
