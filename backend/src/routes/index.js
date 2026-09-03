import { Router } from "express";
// import permissionRoutes from "./permission.routes.js";
// import roleRoutes from "./role.routes.js";
import authRouter from "./auth.routes.js";

const router = Router();

// router.use("/permissions", permissionRoutes);
// router.use("/roles", roleRoutes);
router.use("/auth",authRouter)

export default router;
