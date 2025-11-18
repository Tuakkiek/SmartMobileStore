// routes/userRoutes.js
import express from "express";
import {
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getAllEmployees,
  createEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
} from "../controllers/userController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import { updateEmployeeAvatar } from "../controllers/userController.js";
import { updateEmployee } from "../controllers/userController.js";

const router = express.Router();

router.use(protect);

// Customer routes
router.put("/profile", restrictTo("CUSTOMER"), updateProfile);
router.post("/addresses", restrictTo("CUSTOMER"), addAddress);
router.put("/addresses/:addressId", restrictTo("CUSTOMER"), updateAddress);
router.delete("/addresses/:addressId", restrictTo("CUSTOMER"), deleteAddress);

// Admin routes - Quản lý nhân viên (bao gồm SHIPPER)
router.get("/employees", restrictTo("ADMIN"), getAllEmployees);
router.post("/employees", restrictTo("ADMIN"), createEmployee);
router.patch(
  "/employees/:id/toggle-status",
  restrictTo("ADMIN"),
  toggleEmployeeStatus
);
router.delete("/employees/:id", restrictTo("ADMIN"), deleteEmployee);

router.put("/employees/:id/avatar", restrictTo("ADMIN"), updateEmployeeAvatar);
router.put("/employees/:id", restrictTo("ADMIN"), updateEmployee);

export default router;
