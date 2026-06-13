import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, Grid3x3, List, Download, Heart, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const APP_TYPES = [
  { value: "all", label: "All Types" },
  { value: "illustration", label: "Illustrations" },
  { value: "ad", label: "Ads" },
  { value: "mockup", label: "Mockups" },
  { value: "video_plan", label: "Video Plans" },
  { value: "billboard", label: "Billboards" },
];

export default function Gallery() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const allAssets = await base44.entities.Asset.list('-created_date');
      return allAssets || [];
    },
    initialData: [],
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (asset) => {
      await base44.entities.Asset.update(asset.id, {
        is_favorite: !asset.is_favorite
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assets']);
    }
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId) => {
      await base44.entities.Asset.delete(assetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assets']);
    }
  });

  const handleDownload = (asset) => {
    const link = document.createElement('a');
    link.href = asset.file_url;
    link.download = asset.name || 'asset.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    base44.entities.Asset.update(asset.id, {
      download_count: (asset.download_count || 0) + 1
    });
  };

  const filteredAssets = assets.filter(asset => {
    if (filterType !== "all" && asset.asset_type !== filterType) return false;
    if (favoritesOnly && !asset.is_favorite) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        asset.name?.toLowerCase().includes(query) ||
        asset.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const getTypeColor = (type) => {
    const colors = {
      illustration: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      ad: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      mockup: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      video_plan: "bg-green-500/20 text-green-400 border-green-500/30",
      billboard: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    };
    return colors[type] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            to={createPageUrl("Dashboard")}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Gallery</h1>
              <p className="text-slate-400">
                {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
                {filterType !== "all" && ` in ${APP_TYPES.find(t => t.value === filterType)?.label}`}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900/50 border-slate-800 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-slate-700 text-white"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-48 bg-slate-900/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={favoritesOnly ? "default" : "outline"}
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={favoritesOnly ? "bg-red-500 hover:bg-red-600" : "border-slate-700 hover:bg-slate-800"}
              >
                <Heart className={`w-4 h-4 mr-2 ${favoritesOnly ? 'fill-current' : ''}`} />
                Favorites
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className={`border-slate-700 ${viewMode === "grid" ? "bg-slate-800" : ""}`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className={`border-slate-700 ${viewMode === "list" ? "bg-slate-800" : ""}`}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assets Grid/List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading assets...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-24">
              <div className="text-center text-slate-400">
                <p className="text-lg mb-2">No assets found</p>
                <p className="text-sm">Start creating with our AI tools</p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className="group bg-slate-900/50 border-slate-800 overflow-hidden hover:border-slate-700 transition-all duration-200">
                <div className="relative aspect-square bg-slate-800">
                  {asset.file_type === "image" && asset.file_url && (
                    <img
                      src={asset.file_url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleDownload(asset)}
                        className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border-0"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => toggleFavoriteMutation.mutate(asset)}
                        className={`bg-white/10 hover:bg-white/20 backdrop-blur-sm border-0 ${
                          asset.is_favorite ? 'text-red-500' : 'text-white'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${asset.is_favorite ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => deleteAssetMutation.mutate(asset.id)}
                        className="bg-white/10 hover:bg-red-500/50 backdrop-blur-sm text-white border-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-white font-medium mb-2 line-clamp-1">
                    {asset.name || 'Untitled'}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge className={`${getTypeColor(asset.asset_type)} border text-xs`}>
                      {asset.asset_type}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {format(new Date(asset.created_date), 'MMM d')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className="bg-slate-900/50 border-slate-800 hover:bg-slate-900/80 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                      {asset.file_type === "image" && asset.file_url && (
                        <img
                          src={asset.file_url}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium mb-1 truncate">
                        {asset.name || 'Untitled'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getTypeColor(asset.asset_type)} border text-xs`}>
                          {asset.asset_type}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {format(new Date(asset.created_date), 'MMM d, yyyy')}
                        </span>
                        {asset.download_count > 0 && (
                          <span className="text-xs text-slate-400">
                            {asset.download_count} download{asset.download_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(asset)}
                        className="border-slate-700 hover:bg-slate-800"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleFavoriteMutation.mutate(asset)}
                        className={`border-slate-700 hover:bg-slate-800 ${
                          asset.is_favorite ? 'text-red-500' : ''
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${asset.is_favorite ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAssetMutation.mutate(asset.id)}
                        className="border-slate-700 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}