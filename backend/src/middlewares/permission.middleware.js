import httpStatusCodes from "../utils/httpStatusCodes";

const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const userPermissions = req.user.role.permissions.map((p) => p.name);

    if (!userPermissions.includes(requiredPermission)) {
      return res.status(httpStatusCodes.FORBIDDEN).json({
        success: false,
        message: "Forbidden request. Permission denied.",
      });
    }
    next();
  };
};

export default checkPermission;