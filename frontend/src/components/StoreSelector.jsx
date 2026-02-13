import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, Check } from "lucide-react";
import { storeAPI } from "@/lib/api";

const StoreSelector = ({ onSelectStore, selectedStoreId, customerAddress }) => {
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!customerAddress?.province) {
      setStores([]);
      return;
    }

    const run = async () => {
      try {
        setIsLoading(true);
        const response = await storeAPI.getNearby({
          province: customerAddress.province,
          district: customerAddress.district,
        });
        setStores(response.data?.stores || []);
      } catch (error) {
        console.error("StoreSelector.fetchNearby failed:", error);
        setStores([]);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [customerAddress?.province, customerAddress?.district]);

  if (isLoading) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Dang tim cua hang gan ban...</div>;
  }

  if (stores.length === 0) {
    return (
      <Card className="p-4 text-center text-sm text-muted-foreground">
        Khong tim thay cua hang phu hop
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {stores.map((store) => {
        const selected = selectedStoreId === store._id;

        return (
          <Card
            key={store._id}
            className={`cursor-pointer p-4 transition-colors ${
              selected ? "border-2 border-primary bg-primary/5" : "hover:border-primary/40"
            }`}
            onClick={() => onSelectStore?.(store)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{store.name}</h4>
                  {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                </div>

                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4" />
                  <span>
                    {store.address?.street}, {store.address?.district}, {store.address?.province}
                  </span>
                </p>

                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{store.phone || "N/A"}</span>
                </p>

                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>8:00 - 22:00</span>
                </p>
              </div>

              <Button
                size="sm"
                variant={selected ? "default" : "outline"}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectStore?.(store);
                }}
              >
                {selected ? "Da chon" : "Chon"}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default StoreSelector;
