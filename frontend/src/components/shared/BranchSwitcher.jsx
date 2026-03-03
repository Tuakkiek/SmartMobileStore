import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { storeAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Warehouse } from "lucide-react";
import { toast } from "sonner";

const ALL_VALUE = "ALL";

const BranchSwitcher = ({ className = "" }) => {
  const {
    user,
    authz,
    simulatedBranchId,
    contextMode,
    setBranchSimulation,
    clearBranchSimulation,
  } = useAuthStore();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const isGlobalAdmin = Boolean(
    authz?.isGlobalAdmin || String(user?.role || "").toUpperCase() === "GLOBAL_ADMIN",
  );

  const mode = String(contextMode || authz?.contextMode || "STANDARD").toUpperCase();
  const currentValue =
    isGlobalAdmin && mode === "SIMULATED" && simulatedBranchId
      ? String(simulatedBranchId)
      : ALL_VALUE;

  useEffect(() => {
    const loadBranches = async () => {
      if (!isGlobalAdmin || !user) {
        setBranches([]);
        return;
      }

      setLoading(true);
      try {
        const response = await storeAPI.getAll({ limit: 200, status: "ACTIVE" });
        const data = response.data;
        // API returns { success: true, stores: [...], pagination: {...} }
        const stores = data?.stores || data?.data?.stores || data?.data || [];
        setBranches(Array.isArray(stores) ? stores : []);
      } catch (error) {
        console.error("Failed to load branch options:", error);
        setBranches([]);
      } finally {
        setLoading(false);
      }
    };

    loadBranches();
  }, [isGlobalAdmin, user]);

  const labelById = useMemo(() => {
    const map = new Map();
    for (const branch of branches) {
      map.set(String(branch._id), `${branch.code || ""} - ${branch.name || ""}`.trim());
    }
    return map;
  }, [branches]);

  const onChange = async (value) => {
    if (!isGlobalAdmin || switching || value === currentValue) {
      return;
    }

    setSwitching(true);
    try {
      if (value === ALL_VALUE) {
        const result = await clearBranchSimulation();
        if (!result?.success) {
          throw new Error(result?.message || "Failed to switch to ALL mode");
        }
        toast.success("Switched to ALL mode");
      } else {
        const result = await setBranchSimulation(value);
        if (!result?.success) {
          throw new Error(result?.message || "Failed to simulate selected branch");
        }
        toast.success(`Simulating branch: ${labelById.get(value) || value}`);
      }
    } catch (error) {
      console.error("Failed to switch branch mode:", error);
      toast.error(error?.message || "Failed to switch branch mode");
    } finally {
      setSwitching(false);
    }
  };

  if (!isGlobalAdmin) {
    return null;
  }

  return (
    <div className={className}>
      <Select value={currentValue} onValueChange={onChange} disabled={switching}>
        <SelectTrigger className={cn("h-9 w-full bg-background border-muted-foreground/20", className)}>
          <div className="flex items-center gap-2 truncate text-left overflow-hidden w-full">
            {loading || switching ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Warehouse className="h-4 w-4 shrink-0 text-primary" />
            )}
            <SelectValue placeholder="Select branch scope" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>ALL (Read scope)</SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch._id} value={String(branch._id)}>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{branch.code || branch.storeCode}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[220px]">
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
