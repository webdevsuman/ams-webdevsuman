const PERMISSIONS = {
  USER: {
    CREATE: "user:create",
    READ: "user:read",
    UPDATE: "user:update",
    DELETE: "user:delete",
    ASSIGN_ROLE: "user:assign_role",
    CREATE_SUBADMIN: "user:create_subadmin",
  },
  ROLE: {
    CREATE: "role:create",
    READ: "role:read",
    UPDATE: "role:update",
    DELETE: "role:delete",
    ASSIGN_PERMISSION: "role:assign_permission",
  },
  TASK: {
    CREATE: "task:create",
    ASSIGN: "task:assign",
    READ_ALL: "task:read_all",
    READ_OWN: "task:read_own",
    UPDATE_ANY: "task:update_any",
    UPDATE_OWN: "task:update_own",
    DELETE: "task:delete",
  },
  REPORT: {
    VIEW: "report:view",
  },
};

export default PERMISSIONS;