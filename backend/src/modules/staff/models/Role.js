const mongoose = require("mongoose");
const {
  STAFF_PERMISSION_CATALOG,
  createEmptyPermissions,
  normalizePermissions,
} = require("../permissions");

const permissionsSchema = new mongoose.Schema(
  Object.fromEntries(
    Object.entries(STAFF_PERMISSION_CATALOG).map(([moduleName, actions]) => [
      moduleName,
      {
        type: new mongoose.Schema(
          Object.fromEntries(actions.map((action) => [action, { type: Boolean, default: false }])),
          { _id: false }
        ),
        default: () => createEmptyPermissions()[moduleName],
      },
    ])
  ),
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    permissions: {
      type: permissionsSchema,
      default: () => createEmptyPermissions(),
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

roleSchema.pre("validate", function normalizeRolePermissions() {
  this.permissions = normalizePermissions(this.permissions);
});

module.exports = {
  Role: mongoose.model("Role", roleSchema),
};
