import React from "react";
import { X } from "lucide-react";

const SlideInPanel = ({ isOpen, onClose, title, children }) => {
  return (
    <>
      {/* Overlay with Backdrop Blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-red-50 to-orange-50">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-80px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </>
  );
};

export default SlideInPanel;
