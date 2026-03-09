import React from "react";
import { Routes } from "react-router-dom";
import publicRoutes from "./routes/public.routes";
import customerRoutes from "./routes/customer.routes";
import adminRoutes from "./routes/admin.routes";
import warehouseRoutes from "./routes/warehouse.routes";
import operationsRoutes from "./routes/operations.routes";

const AppRouter = () => (
  <Routes>
    {publicRoutes}
    {customerRoutes}
    {adminRoutes}
    {warehouseRoutes}
    {operationsRoutes}
  </Routes>
);

export default AppRouter;
