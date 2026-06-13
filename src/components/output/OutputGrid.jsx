import React from "react";
import { Download, Heart, Star, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function OutputGrid({ variations = [], onDownload, onFavorite, onRate }) {
  const handleDownload = async (variation) => {
    if (onDownload) {
      onDownload(variation);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = variation.output_url;
      link.download = `variation_${variation.sequence_number}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const toggleFavorite = async (variation) => {
    if (onFavorite) {
      onFavorite(variation);
    }
  };

  if (variations.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="py-12">
          <div className="text-center text-slate-400">
            <p>No variations generated yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {variations.map((variation) => (
        <Card
          key={variation.id}
          className="group bg-slate-900/50 border-slate-800 overflow-hidden hover:border-slate-700 transition-all duration-200"
        >
          <div className="relative aspect-square bg-slate-800">
            {variation.status === 'complete' && variation.output_url ? (
              <>
                <img
                  src={variation.output_url}
                  alt={variation.instruction}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleDownload(variation)}
                      className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border-0"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleFavorite(variation)}
                      className={`bg-white/10 hover:bg-white/20 backdrop-blur-sm border-0 ${
                        variation.is_favorite ? 'text-red-500' : 'text-white'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${variation.is_favorite ? 'fill-current' : ''}`}
                      />
                    </Button>
                  </div>
                </div>
              </>
            ) : variation.status === 'generating' || variation.status === 'pending' ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-red-400 text-sm">Failed to generate</p>
              </div>
            )}
            
            <div className="absolute top-3 right-3">
              <Badge className="bg-slate-900/80 text-white border-0">
                #{variation.sequence_number}
              </Badge>
            </div>
          </div>

          <CardContent className="p-4">
            <p className="text-white font-medium mb-2 line-clamp-2">
              {variation.instruction}
            </p>
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={`text-xs ${
                  variation.status === 'complete'
                    ? 'border-green-500/30 text-green-400'
                    : variation.status === 'failed'
                    ? 'border-red-500/30 text-red-400'
                    : 'border-blue-500/30 text-blue-400'
                }`}
              >
                {variation.status}
              </Badge>
              {variation.user_rating && (
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < variation.user_rating
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}