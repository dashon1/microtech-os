import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Download, Image as ImageIcon, Grid3x3, Film, Wand2, Maximize, Eraser, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function IllustrationGenerator() {
  const queryClient = useQueryClient();
  const [baseImage, setBaseImage] = useState(null);
  const [baseImagePreview, setBaseImagePreview] = useState(null);
  const [variationText, setVariationText] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
  const [strictBrandPalette, setStrictBrandPalette] = useState(true);
  const [styleLock, setStyleLock] = useState(true);
  const [expressionIntensity, setExpressionIntensity] = useState(50);
  const [propSize, setPropSize] = useState(50);
  const [colorStrictness, setColorStrictness] = useState(80);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const presetVariations = [
    "happy grin",
    "shocked expression",
    "crying with laughter",
    "winking",
    "reading a book",
    "working on laptop",
    "holding coffee cup",
    "thumbs up",
    "superhero pose",
    "wearing party hat with confetti"
  ];

  const enhancePrompt = async () => {
    if (!variationText.trim()) return;
    const instructions = variationText.split('\n');
    const lastInstruction = instructions[instructions.length - 1];

    try {
      const res = await base44.functions.invoke('ai_tools', {
        task: 'magic_prompt',
        prompt: lastInstruction,
        context: 'Consistent character illustration variation'
      });
      if (res.data.prompt) {
        const newText = instructions.slice(0, -1).concat(res.data.prompt).join('\n');
        setVariationText(newText);
      }
    } catch (e) { console.error(e); }
  };

  const runTool = async (task, imageUrl) => {
      if(!confirm(`Run ${task} on this image?`)) return;
      try {
          const res = await base44.functions.invoke('ai_tools', { task, imageUrl });
          if(res.data.url) window.open(res.data.url, '_blank');
      } catch(e) { alert(e.message); }
  };

  const { data: currentJob } = useQuery({
    queryKey: ['job', currentJobId],
    queryFn: async () => {
      if (!currentJobId) return null;
      const jobs = await base44.entities.Job.filter({ id: currentJobId });
      return jobs?.[0] || null;
    },
    enabled: !!currentJobId,
    refetchInterval: (data) => {
      return data?.status === 'processing' ? 2000 : false;
    },
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

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBaseImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBaseImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addPreset = (preset) => {
    setVariationText(prev => prev ? `${prev}\n${preset}` : preset);
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!baseImage) throw new Error("Please upload an avatar or mascot illustration");

      const instructions = variationText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (instructions.length === 0) {
        throw new Error("Please add at least one variation");
      }

      if (instructions.length > 30) {
        throw new Error("Maximum 30 variations per batch");
      }

      setIsGenerating(true);

      const { file_url } = await base44.integrations.Core.UploadFile({ file: baseImage });

      const job = await base44.entities.Job.create({
        app_type: "illustration",
        base_image_url: file_url,
        settings: {
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          strict_brand_palette: strictBrandPalette,
          style_lock: styleLock,
          expression_intensity: expressionIntensity,
          prop_size: propSize,
          color_strictness: colorStrictness
        },
        total_variations: instructions.length,
        status: "processing"
      });

      setCurrentJobId(job.id);
      queryClient.invalidateQueries(['job', job.id]);

      // Create all variation records first
      const variations = await Promise.all(instructions.map((instruction, i) => 
        base44.entities.Variation.create({
          job_id: job.id,
          sequence_number: i + 1,
          instruction: instruction,
          status: "pending"
        })
      ));

      queryClient.invalidateQueries(['variations', job.id]);

      // Process in batches of 3 to avoid rate limits but be faster than sequential
      const batchSize = 3;
      for (let i = 0; i < variations.length; i += batchSize) {
        const batch = variations.slice(i, i + batchSize);

        await Promise.all(batch.map(async (variation) => {
          try {
            await base44.entities.Variation.update(variation.id, { status: "generating" });

            const result = await base44.functions.invoke('generateMedia', {
              task: 'image_variation',
              referenceImageUrl: file_url,
              instruction: variation.instruction,
              settings: {
                primary_color: primaryColor,
                secondary_color: secondaryColor,
                strict_brand_palette: strictBrandPalette,
                style_lock: styleLock,
                expression_intensity: expressionIntensity,
                prop_size: propSize,
                color_strictness: colorStrictness
              }
            });

            if (result.data.error) throw new Error(result.data.error);

            const imageUrl = result.data.image_url;

            await base44.entities.Variation.update(variation.id, {
              output_url: imageUrl,
              status: "complete",
              model_used: "flux-dev-i2i"
            });

            await base44.entities.Asset.create({
              job_id: job.id,
              variation_id: variation.id,
              file_url: imageUrl,
              file_type: "image",
              asset_type: "illustration",
              name: `${variation.instruction}`
            });

          } catch (error) {
            console.error(`Failed to generate variation ${variation.id}:`, error);
            await base44.entities.Variation.update(variation.id, {
              status: "failed",
              error_message: error.message || "Generation failed"
            });
          }
        }));

        // Update job progress after each batch
        const completed = await base44.entities.Variation.filter({ job_id: job.id, status: "complete" });
        const failed = await base44.entities.Variation.filter({ job_id: job.id, status: "failed" });

        await base44.entities.Job.update(job.id, {
          completed_count: completed.length,
          failed_count: failed.length
        });

        queryClient.invalidateQueries(['variations', job.id]);
        queryClient.invalidateQueries(['job', job.id]);
      }

      await base44.entities.Job.update(job.id, { status: "complete" });

      queryClient.invalidateQueries(['job', job.id]);
      setIsGenerating(false);

      return job;
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const downloadAll = () => {
    const completedVariations = variations.filter(v => v.status === 'complete' && v.output_url);
    completedVariations.forEach((variation, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = variation.output_url;
        link.download = `${variation.instruction.replace(/[^a-z0-9]/gi, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500);
    });
  };

  const instructions = variationText.split('\n').filter(line => line.trim().length > 0);
  const completedCount = variations.filter(v => v.status === 'complete').length;
  const failedCount = variations.filter(v => v.status === 'failed').length;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            to={createPageUrl("Dashboard")}
            className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dynamic Illustration Generator</h1>
              <p className="text-slate-500 dark:text-slate-400">Avatar & Mascot Variations with Fal.ai Flux ControlNet</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Base Image</CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400">Upload illustrated avatar/mascot (PNG with transparency preferred)</p>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {baseImagePreview ? (
                    <div className="relative">
                      <img src={baseImagePreview} alt="Base" className="w-full h-64 object-contain rounded-lg bg-slate-100 dark:bg-slate-800/50" />
                      <Button
                        onClick={() => {
                          setBaseImage(null);
                          setBaseImagePreview(null);
                        }}
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center hover:border-slate-300 dark:hover:border-slate-600 transition-colors bg-slate-50 dark:bg-slate-900/30">
                        <ImageIcon className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                        <p className="text-slate-900 dark:text-white font-medium mb-2">Click to upload</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">PNG, JPG, or WebP</p>
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Brand Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-900 dark:text-white mb-2 block">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-14 h-10 p-1 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-900 dark:text-white mb-2 block">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-14 h-10 p-1 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-900 dark:text-white">Strict Brand Palette</Label>
                  <Switch checked={strictBrandPalette} onCheckedChange={setStrictBrandPalette} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Variations</CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400">One variation per line (max 30)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {presetVariations.map((preset) => (
                    <Button
                      key={preset}
                      onClick={() => addPreset(preset)}
                      variant="outline"
                      size="sm"
                      className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white"
                    >
                      + {preset}
                    </Button>
                  ))}
                </div>
                <div className="relative">
                  <Textarea
                      value={variationText}
                      onChange={(e) => setVariationText(e.target.value)}
                      placeholder="happy grin&#10;shocked expression&#10;crying with laughter&#10;winking&#10;reading a book"
                      className="min-h-[200px] bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono pr-10"
                  />
                  <Button 
                      size="icon" 
                      variant="ghost" 
                      className="absolute top-2 right-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={enhancePrompt}
                      title="Magic Enhance Last Line"
                  >
                      <Wand2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {instructions.length} / 30 variations specified
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Consistency Locks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-slate-900 dark:text-white">Style Lock</Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Preserve line weight, palette & shading</p>
                  </div>
                  <Switch checked={styleLock} onCheckedChange={setStyleLock} />
                </div>
              </CardContent>
            </Card>

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-slate-900 dark:text-white">Prompt Tuning</CardTitle>
                      <Sparkles className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-slate-900 dark:text-white">Expression Intensity</Label>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{expressionIntensity}%</span>
                      </div>
                      <Slider
                        value={[expressionIntensity]}
                        onValueChange={(val) => setExpressionIntensity(val[0])}
                        min={0}
                        max={100}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Subtle</span>
                        <span>Exaggerated</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-slate-900 dark:text-white">Prop Size</Label>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{propSize}%</span>
                      </div>
                      <Slider
                        value={[propSize]}
                        onValueChange={(val) => setPropSize(val[0])}
                        min={0}
                        max={100}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Small</span>
                        <span>Large</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-slate-900 dark:text-white">Color Strictness</Label>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{colorStrictness}%</span>
                      </div>
                      <Slider
                        value={[colorStrictness]}
                        onValueChange={(val) => setColorStrictness(val[0])}
                        min={0}
                        max={100}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Flexible</span>
                        <span>Brand Only</span>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <Button
              onClick={handleGenerate}
              disabled={!baseImage || instructions.length === 0 || isGenerating}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-6 text-lg font-semibold"
            >
              {isGenerating ? (
                <>Generating {completedCount} / {instructions.length}...</>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate {instructions.length} Variation{instructions.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
            {currentJob ? (
              <>
                <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-slate-900 dark:text-white">Generation Progress</CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => alert("Template saved!")} className="h-7 text-xs">Save Template</Button>
                        <Badge className={currentJob.status === 'complete' ? 'bg-green-500' : 'bg-blue-500'}>
                          {currentJob.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Completed</span>
                        <span className="text-slate-900 dark:text-white font-semibold">{completedCount} / {currentJob.total_variations}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-500"
                          style={{ width: `${(completedCount / currentJob.total_variations) * 100}%` }}
                        />
                      </div>
                      {failedCount > 0 && (
                        <p className="text-red-400 text-sm">{failedCount} failed</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {variations.length > 0 && (
                  <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-slate-900 dark:text-white">Results</CardTitle>
                        <div className="flex gap-2">
                          {completedCount > 0 && (
                            <Button onClick={downloadAll} variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                              <Download className="w-4 h-4 mr-2" />
                              Download All
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => alert("App duplicated!")} className="text-slate-500">Duplicate App</Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="png" className="w-full">
                        <TabsList className="bg-slate-100 dark:bg-slate-800">
                          <TabsTrigger value="png" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
                            <ImageIcon className="w-4 h-4 mr-2" />
                            PNG Files
                          </TabsTrigger>
                          <TabsTrigger value="sprite" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
                            <Grid3x3 className="w-4 h-4 mr-2" />
                            Sprite Sheet
                          </TabsTrigger>
                          <TabsTrigger value="gif" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
                            <Film className="w-4 h-4 mr-2" />
                            Loop GIF
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="png" className="mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            {variations.map((variation) => (
                              <div key={variation.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                {variation.status === 'complete' && variation.output_url ? (
                                  <>
                                    <img
                                      src={variation.output_url}
                                      alt={variation.instruction}
                                      className="w-full h-48 object-contain rounded mb-2 bg-white dark:bg-slate-900/50"
                                    />
                                    <p className="text-sm text-slate-900 dark:text-white font-medium mb-1 truncate" title={variation.instruction}>{variation.instruction}</p>
                                    <div className="flex gap-1">
                                      <Button
                                          onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = variation.output_url;
                                          link.download = `${variation.instruction.replace(/[^a-z0-9]/gi, '_')}.png`;
                                          link.click();
                                          }}
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 h-8 text-xs"
                                      >
                                          <Download className="w-3 h-3 mr-1" />
                                          Save
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => runTool('upscale', variation.output_url)} title="Upscale 4x">
                                          <Maximize className="w-3 h-3" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => runTool('remove_bg', variation.output_url)} title="Remove BG">
                                          <Eraser className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </>
                                ) : variation.status === 'failed' ? (
                                  <div className="h-48 flex items-center justify-center bg-red-500/10 rounded">
                                    <p className="text-red-400 text-sm">Failed</p>
                                  </div>
                                ) : (
                                  <div className="h-48 flex items-center justify-center bg-white dark:bg-slate-900/50 rounded">
                                    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        <TabsContent value="sprite" className="mt-4">
                          <div className="flex flex-col items-center justify-center py-12">
                            <Button 
                              onClick={async () => {
                                const completed = variations.filter(v => v.status === 'complete').map(v => v.output_url);
                                if (completed.length < 2) {
                                  alert('Need at least 2 completed variations');
                                  return;
                                }
                                const res = await base44.functions.invoke('processImageAssets', {
                                  imageUrls: completed,
                                  type: 'sprite'
                                });
                                if (res.data.success) {
                                  // Open image
                                  window.open(res.data.file_url, '_blank');
                                  // Download JSON map
                                  if (res.data.extra_data) {
                                      const jsonBlob = new Blob([JSON.stringify(res.data.extra_data, null, 2)], { type: 'application/json' });
                                      const jsonUrl = URL.createObjectURL(jsonBlob);
                                      const a = document.createElement('a');
                                      a.href = jsonUrl;
                                      a.download = 'sprite_map.json';
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                  }
                                }
                              }}
                              disabled={completedCount < 2}
                              className="mb-4"
                            >
                              <Grid3x3 className="w-4 h-4 mr-2" />
                              Generate Sprite Sheet & JSON
                            </Button>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Combines variations into 4096px sheet + JSON map</p>
                          </div>
                        </TabsContent>
                        <TabsContent value="gif" className="mt-4">
                          <div className="flex flex-col items-center justify-center py-12">
                            <Button 
                              onClick={async () => {
                                const completed = variations.filter(v => v.status === 'complete').map(v => v.output_url);
                                if (completed.length < 2) {
                                  alert('Need at least 2 completed variations');
                                  return;
                                }
                                const res = await base44.functions.invoke('processImageAssets', {
                                  imageUrls: completed,
                                  type: 'gif',
                                  options: { delay: 500 }
                                });
                                if (res.data.success) {
                                  window.open(res.data.file_url, '_blank');
                                }
                              }}
                              disabled={completedCount < 2}
                              className="mb-4"
                            >
                              <Film className="w-4 h-4 mr-2" />
                              Generate Loop GIF
                            </Button>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Creates an animated GIF from variations (0.5s per frame)</p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                <CardContent className="py-24">
                  <div className="text-center text-slate-400">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg text-slate-900 dark:text-white">Your variations will appear here</p>
                    <p className="text-sm mt-2 opacity-75">Using Fal.ai Flux ControlNet for consistency</p>
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