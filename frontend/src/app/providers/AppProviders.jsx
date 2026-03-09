import React, { useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const ProviderContent = ({ children }) => (
  <>
    <ScrollToTop />
    <Toaster position="bottom-right" richColors />
    {children}
  </>
);

const AppProviders = ({ children }) => (
  <BrowserRouter>
    <ProviderContent>{children}</ProviderContent>
  </BrowserRouter>
);

export default AppProviders;
