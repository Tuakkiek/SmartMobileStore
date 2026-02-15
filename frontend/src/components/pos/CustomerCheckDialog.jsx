import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

const CustomerCheckDialog = ({ open, onOpenChange, onConfirm, customerName, customerPhone }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <UserPlus className="w-5 h-5" />
            Customer Not Found
          </DialogTitle>
          <DialogDescription className="pt-2 text-base text-gray-700">
            The customer <strong>{customerName}</strong> ({customerPhone}) is not registered in the system.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border">
            Do you want to create a new account for this customer automatically?
            <br />
            <span className="mt-1 block text-xs text-gray-400">
              * A default password will be generated: Name + @ + Last 3 digits of phone
            </span>
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">
            Yes, Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerCheckDialog;
