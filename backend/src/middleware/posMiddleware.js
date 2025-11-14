// backend/src/middleware/posMiddleware.js
export const restrictPOS = (req, res, next) => {
  if (!["POS_STAFF", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Chỉ nhân viên bán hàng mới có quyền này",
    });
  }
  next();
};

export const restrictAccountant = (req, res, next) => {
  if (!["ACCOUNTANT", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Chỉ kế toán mới có quyền này",
    });
  }
  next();
};