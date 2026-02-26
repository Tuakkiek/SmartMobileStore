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
import { MapPin, Loader2, Warehouse } from "lucide-react";
import { toast } from "sonner";

const BranchSwitcher = ({ className }) => {
  const { user, authz, activeBranchId, setActiveBranch } = useAuthStore();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const res = await storeAPI.getAll({ limit: 100 });
        const allStores = res.data?.data || [];
        
        // Filter based on permissions
        if (authz?.isGlobalAdmin) {
          setBranches(allStores);
        } else {
          const allowedIds = authz?.allowedBranchIds || [];
          setBranches(allStores.filter(s => allowedIds.includes(s._id)));
        }
      } catch (err) {
        console.error("Failed to fetch branches:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [user, authz]);

  const handleSwitch = async (branchId) => {
    if (branchId === activeBranchId) return;

    try {
      const res = await authAPI.setActiveBranchContext({ branchId });
      if (res.data?.success) {
        setActiveBranch(branchId);
        toast.success("Đã chuyển đổi chi nhánh");
        // Reload to apply new context consistently across all hooks/components
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to switch branch:", err);
      toast.error("Không thể chuyển đổi chi nhánh");
    }
  };

  if (branches.length <= 1 && !authz?.isGlobalAdmin) return null;

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
            <SelectValue placeholder="Chọn chi nhánh" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch._id} value={branch._id}>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{branch.storeCode}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {branch.storeName}
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
