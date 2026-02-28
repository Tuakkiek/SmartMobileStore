import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { authAPI, storeAPI } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Warehouse } from "lucide-react";
import { toast } from "sonner";

const BranchSwitcher = ({ className }) => {
  const { user, authz, activeBranchId, setActiveBranch } = useAuthStore();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const isGlobalAdmin = Boolean(
    authz?.isGlobalAdmin || String(user?.role || "").toUpperCase() === "GLOBAL_ADMIN",
  );

  useEffect(() => {
    const fetchBranches = async () => {
      if (!user || !isGlobalAdmin) {
        setBranches([]);
        return;
      }

      setLoading(true);
      try {
        const res = await storeAPI.getAll({ limit: 100 });
        const payload = res.data?.data;
        const allStores = Array.isArray(payload) ? payload : payload?.stores || [];
        setBranches(Array.isArray(allStores) ? allStores : []);
      } catch (error) {
        console.error("Failed to fetch branches:", error);
        setBranches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [user, isGlobalAdmin]);

  const handleSwitch = async (branchId) => {
    if (!isGlobalAdmin || branchId === activeBranchId) {
      return;
    }

    try {
      const res = await authAPI.setActiveBranchContext({ branchId });
      if (res.data?.success) {
        setActiveBranch(branchId);
        toast.success("Da chuyen doi chi nhanh");
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to switch branch:", error);
      toast.error(error.response?.data?.message || "Khong the chuyen doi chi nhanh");
    }
  };

  if (!isGlobalAdmin) {
    return null;
  }

  return (
    <div className={className}>
      <Select value={activeBranchId || ""} onValueChange={handleSwitch}>
        <SelectTrigger className="h-9 w-[180px] lg:w-[240px] bg-background border-muted-foreground/20">
          <div className="flex items-center gap-2 truncate">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Warehouse className="h-4 w-4 shrink-0 text-primary" />
            )}
            <SelectValue placeholder="Chon chi nhanh" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch._id} value={branch._id}>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{branch.code || branch.storeCode}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {branch.name || branch.storeName}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default BranchSwitcher;
