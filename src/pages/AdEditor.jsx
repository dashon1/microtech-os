import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Megaphone, Download, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUploadZone from "../components/upload/FileUploadZone";
import BrandKitSelector from "../components/branding/BrandKitSelector";
import JobProgress from "../components/jobs/JobProgress";
import OutputGrid from "../components/output/OutputGrid";

export default function AdEditor() {
  const queryClient = useQueryClient();
  const [baseAd, setBaseAd] = useState(null);
  const [editText, setEditText] = useState("");
  const [brandKitId, setBrandKitId] = useState("");
  const [preserveText, setPreserveText] = useState(true);
  const [preserveLogo, setPreserveLogo] = useState(true);
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

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!baseAd) throw new Error("Please upload an ad image");
      if (!editText.trim()) throw new Error("Please add edit instructions");

      const { file_url } = await base44.integrations.Core.UploadFile({ file: baseAd });

      const instructions = editText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (instructions.length === 0) {
        throw new Error("Please add at least one edit instruction");
      }

      let brandKit = null;
      if (brandKitId) {
        const kits = await base44.entities.BrandKit.filter({ id: brandKitId });
        brandKit = kits?.[0];
      }

      // Analyze ad elements
      const adAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this advertisement and identify:
- Logo locations and text
- Brand colors used
- Layout structure
- Key design elements to preserve

Return as JSON with these keys: logos, text_elements, brand_colors, layout`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            logos: { type: "array", items: { type: "string" } },
            text_elements: { type: "array", items: { type: "string" } },
            brand_colors: { type: "array", items: { type: "string" } },
            layout: { type: "string" }
          }
        }
      });

      const job = await base44.entities.Job.create({
        app_type: "ad_editor",
        base_image_url: file_url,
        brand_kit_id: brandKitId || null,
        settings: {
          preserve_text: preserveText,
          preserve_logo: preserveLogo,
          resolution: resolution,
          ad_analysis: adAnalysis
        },
        total_variations: instructions.length,
        status: "processing"
      });

      for (let i = 0; i < instructions.length; i++) {
        const instruction = instructions[i];

        const variation = await base44.entities.Variation.create({
          job_id: job.id,
          sequence_number: i + 1,
          instruction: instruction,
          status: "generating"
        });

        try {
          let preserveInstructions = "";
          if (preserveText && adAnalysis.text_elements?.length > 0) {
            preserveInstructions += `Keep ALL text intact: ${adAnalysis.text_elements.join(', ')}\n`;
          }
          if (preserveLogo && adAnalysis.logos?.length > 0) {
            preserveInstructions += `Keep ALL logos intact: ${adAnalysis.logos.join(', ')}\n`;
          }
          if (brandKit) {
            preserveInstructions += `Maintain brand colors: ${brandKit.primary_color}, ${brandKit.secondary_color}\n`;
          }

          const optimizedPrompt = await base44.integrations.Core.InvokeLLM({
            prompt: `Create an image generation prompt for editing this advertisement:

EDIT REQUEST: ${instruction}

MUST PRESERVE:
${preserveInstructions}
- Professional advertising quality
- Clean, modern design
- Original layout structure: ${adAnalysis.layout}

Generate a detailed prompt for a ${resolution}x${resolution}px advertising image.`
          });

          await base44.entities.Variation.update(variation.id, {
            prompt_generated: optimizedPrompt
          });

          const { url } = await base44.integrations.Core.GenerateImage({
            prompt: optimizedPrompt
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
            asset_type: "ad",
            name: `Ad Edit ${i + 1}: ${instruction}`
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

  const instructions = editText.split('\n').filter(line => line.trim().length > 0);

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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Ad Multi-Editor</h1>
              <p className="text-slate-400">Create campaign variations at scale</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Base Advertisement</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploadZone onFileSelect={setBaseAd} />
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Brand Kit (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <BrandKitSelector value={brandKitId} onChange={setBrandKitId} />
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Edit Instructions</CardTitle>
                <p className="text-sm text-slate-400 mt-1">One edit per line</p>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Replace burger with pizza&#10;Change background to beach scene&#10;Add '50% OFF' text overlay&#10;Make it summer themed&#10;Change model to wearing sunglasses"
                  className="min-h-[200px] bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                />
                <p className="text-sm text-slate-400 mt-2">
                  {instructions.length} edit{instructions.length !== 1 ? 's' : ''} specified
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Brand Lock Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Preserve Text</Label>
                    <p className="text-sm text-slate-400">Keep original text elements</p>
                  </div>
                  <Switch checked={preserveText} onCheckedChange={setPreserveText} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Preserve Logo</Label>
                    <p className="text-sm text-slate-400">Keep logo intact</p>
                  </div>
                  <Switch checked={preserveLogo} onCheckedChange={setPreserveLogo} />
                </div>

                <div>
                  <Label className="text-white mb-2 block">Resolution</Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024">1024×1024</SelectItem>
                      <SelectItem value="2048">2048×2048</SelectItem>
                      <SelectItem value="4096">4096×4096</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!baseAd || instructions.length === 0 || generateMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-6 text-lg font-semibold"
            >
              {generateMutation.isPending ? "Generating..." : `Generate ${instructions.length} Variation${instructions.length !== 1 ? 's' : ''}`}
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
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-white">Results</h3>
                  </div>
                )}
                <OutputGrid variations={variations} />
              </>
            ) : (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-24">
                  <div className="text-center text-slate-400">
                    <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Your edited ads will appear here</p>
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