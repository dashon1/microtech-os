
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUploadZone from "../components/upload/FileUploadZone";
import JobProgress from "../components/jobs/JobProgress";
import OutputGrid from "../components/output/OutputGrid";

const PRODUCTS = [
  { id: "tshirt-white", name: "T-Shirt (White)", icon: "👕" },
  { id: "tshirt-black", name: "T-Shirt (Black)", icon: "👕" },
  { id: "hoodie", name: "Hoodie", icon: "🧥" },
  { id: "mug", name: "Coffee Mug", icon: "☕" },
  { id: "tote-bag", name: "Tote Bag", icon: "👜" },
  { id: "phone-case", name: "Phone Case", icon: "📱" },
  { id: "poster", name: "Poster", icon: "🖼️" },
  { id: "sticker", name: "Sticker", icon: "🏷️" },
];

const SCENES = [
  { id: "studio", name: "Studio", description: "Clean white background" },
  { id: "lifestyle", name: "Lifestyle", description: "In-use photography" },
  { id: "flat-lay", name: "Flat Lay", description: "Top-down view" },
  { id: "outdoor", name: "Outdoor", description: "Natural environment" },
];

export default function MockupMaster() {
  const queryClient = useQueryClient();
  const [artwork, setArtwork] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [scene, setScene] = useState("studio");
  const [resolution, setResolution] = useState("2048");
  const [currentJobId, setCurrentJobId] = useState(null);

  const { data: currentJob } = useQuery({
    queryKey: ['job', currentJobId],
    queryFn: async () => {
      if (!currentJobId) return null;
      const job = await base44.entities.Job.filter({ id: currentJobId });
      return job?.[0] || null;
    },
    enabled: !!currentJobId,
    refetchInterval: (data) => data?.status === 'processing' ? 2000 : false,
  });

  const { data: variations = [] } = useQuery({
    queryKey: ['variations', currentJobId],
    queryFn: async () => {
      if (!currentJobId) return [];
      const vars = await base44.entities.Variation.filter({ job_id: currentJobId });
      return vars || [];
    },
    enabled: !!currentJobId,
    refetchInterval: (data) => {
      const hasProcessing = Array.isArray(data) && data.some(v => v.status === 'pending' || v.status === 'generating');
      return hasProcessing ? 2000 : false;
    },
  });

  const toggleProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!artwork) throw new Error("Please upload artwork");
      if (selectedProducts.length === 0) throw new Error("Please select at least one product");

      const { file_url } = await base44.integrations.Core.UploadFile({ file: artwork });

      const job = await base44.entities.Job.create({
        app_type: "mockup",
        base_image_url: file_url,
        settings: {
          products: selectedProducts,
          scene: scene,
          resolution: resolution
        },
        total_variations: selectedProducts.length,
        status: "processing"
      });

      const sceneInfo = SCENES.find(s => s.id === scene);

      for (let i = 0; i < selectedProducts.length; i++) {
        const productId = selectedProducts[i];
        const product = PRODUCTS.find(p => p.id === productId);

        const variation = await base44.entities.Variation.create({
          job_id: job.id,
          sequence_number: i + 1,
          instruction: `${product.name} - ${sceneInfo.name}`,
          status: "generating"
        });

        try {
          const mockupPrompt = await base44.integrations.Core.InvokeLLM({
            prompt: `Create a detailed prompt for generating a professional product mockup:

Product: ${product.name}
Scene: ${sceneInfo.name} - ${sceneInfo.description}
Resolution: ${resolution}x${resolution}px

The mockup should:
- Show the product with the provided artwork applied
- Be photorealistic with natural lighting
- Include realistic shadows and reflections
- Be studio-quality photography
- Have clean, professional composition
- Artwork should be prominently displayed on the product
- Match the scene style (${sceneInfo.description})

Generate a detailed image generation prompt.`
          });

          await base44.entities.Variation.update(variation.id, {
            prompt_generated: mockupPrompt
          });

          const { url } = await base44.integrations.Core.GenerateImage({
            prompt: mockupPrompt
          });

          await base44.entities.Variation.update(variation.id, {
            output_url: url,
            status: "complete",
            model_used: "gemini"
          });

          await base44.entities.Job.update(job.id, {
            completed_count: i + 1
          });

          await base44.entities.Asset.create({
            job_id: job.id,
            variation_id: variation.id,
            file_url: url,
            file_type: "image",
            asset_type: "mockup",
            name: `${product.name} - ${sceneInfo.name}`
          });

        } catch (error) {
          await base44.entities.Variation.update(variation.id, {
            status: "failed",
            error_message: error.message
          });

          await base44.entities.Job.update(job.id, {
            failed_count: (job.failed_count || 0) + 1
          });
        }
      }

      await base44.entities.Job.update(job.id, {
        status: "complete"
      });

      return job;
    },
    onSuccess: (job) => {
      setCurrentJobId(job.id);
      queryClient.invalidateQueries(['job', job.id]);
      queryClient.invalidateQueries(['variations', job.id]);
    }
  });

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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">MockupMaster</h1>
              <p className="text-slate-400">Generate product mockups instantly</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Your Artwork</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploadZone onFileSelect={setArtwork} />
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Select Products</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {PRODUCTS.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => toggleProduct(product.id)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        selectedProducts.includes(product.id)
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{product.icon}</span>
                        {selectedProducts.includes(product.id) && (
                          <Check className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                      <p className="text-white text-sm font-medium">{product.name}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Scene Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={scene} onValueChange={setScene}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} - {s.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2048">2048×2048 (Standard)</SelectItem>
                    <SelectItem value="3000">3000×3000 (High Res)</SelectItem>
                    <SelectItem value="4096">4096×4096 (Ultra)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!artwork || selectedProducts.length === 0 || generateMutation.isPending}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-6 text-lg font-semibold"
            >
              {generateMutation.isPending ? "Generating..." : `Generate ${selectedProducts.length} Mockup${selectedProducts.length !== 1 ? 's' : ''}`}
            </Button>

            {generateMutation.isError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{generateMutation.error.message}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {currentJob ? (
              <>
                <JobProgress job={currentJob} variations={variations} />
                {variations.length > 0 && (
                  <h3 className="text-xl font-semibold text-white">Results</h3>
                )}
                <OutputGrid variations={variations} />
              </>
            ) : (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-24">
                  <div className="text-center text-slate-400">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Your product mockups will appear here</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
