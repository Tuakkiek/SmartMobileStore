import React, { useEffect } from "react";
import AppProviders from "./providers/AppProviders";
import AppRouter from "./router";
import { useAuthStore } from "@/features/auth";

const AppShell = () => {
  const getCurrentUser = useAuthStore((state) => state.getCurrentUser);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token) {
      getCurrentUser();
    }
  }, [token, getCurrentUser]);

  return <AppRouter />;
};

const App = () => (
  <AppProviders>
    <AppShell />
  </AppProviders>
);

export default App;
