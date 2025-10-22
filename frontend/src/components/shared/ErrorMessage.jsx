// frontend/src/components/shared/ErrorMessage.jsx
import React from "react";

export const ErrorMessage = ({ message }) => {
  return (
    <div className="text-red-500 p-4 border border-red-500 rounded">
      {message || "An error occurred"}
    </div>
  );
};
