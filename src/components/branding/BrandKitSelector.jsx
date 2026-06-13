import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BrandKitSelector({ value, onChange }) {
  const { data: brandKits = [], isLoading } = useQuery({
    queryKey: ['brandKits'],
    queryFn: async () => {
      const kits = await base44.entities.BrandKit.list();
      return kits || [];
    },
    initialData: [],
  });

  return (
    <div className="flex gap-2">
      <Select value={value || ""} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger className="flex-1 bg-slate-900/50 border-slate-700 text-white">
          <SelectValue placeholder={isLoading ? "Loading..." : "Select brand kit (optional)"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>None</SelectItem>
          {brandKits.map((kit) => (
            <SelectItem key={kit.id} value={kit.id}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {kit.primary_color && (
                    <div
                      className="w-3 h-3 rounded-full border border-slate-600"
                      style={{ backgroundColor: kit.primary_color }}
                    />
                  )}
                  {kit.secondary_color && (
                    <div
                      className="w-3 h-3 rounded-full border border-slate-600"
                      style={{ backgroundColor: kit.secondary_color }}
                    />
                  )}
                </div>
                <span>{kit.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Link to={createPageUrl("BrandKits")}>
        <Button variant="outline" size="icon" className="border-slate-700 hover:bg-slate-800">
          <Plus className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}