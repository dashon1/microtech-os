
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Video, Film, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import FileUploadZone from "../components/upload/FileUploadZone";
import JobProgress from "../components/jobs/JobProgress";
import OutputGrid from "../components/output/OutputGrid";

export default function VideoStoryboard() {
  const queryClient = useQueryClient();
  const [productImage, setProductImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [characterImage, setCharacterImage] = useState(null);
  const [sceneCount, setSceneCount] = useState("5");
  const [style, setStyle] = useState("cinematic");
  const [currentJobId, setCurrentJobId] = useState(null);
  const [poster, setPoster] = useState(null);
  const [videoPlan, setVideoPlan] = useState(null);

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

  const generatePosterMutation = useMutation({
    mutationFn: async () => {
      if (!productImage || !backgroundImage) {
        throw new Error("Please upload product and background images");
      }

      const productUrl = (await base44.integrations.Core.UploadFile({ file: productImage })).file_url;
      const backgroundUrl = (await base44.integrations.Core.UploadFile({ file: backgroundImage })).file_url;
      
      let characterUrl = null;
      if (characterImage) {
        characterUrl = (await base44.integrations.Core.UploadFile({ file: characterImage })).file_url;
      }

      const fileUrls = [productUrl, backgroundUrl];
      if (characterUrl) fileUrls.push(characterUrl);

      const posterPrompt = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a cinematic product advertisement poster by combining these elements:
- Product image (hero element)
- Background scene
${characterUrl ? '- Character/model' : ''}

Style: ${style}, dramatic lighting, professional advertising quality, 4K resolution
Color grading: Cinematic and cohesive
Composition: Product as hero, background provides context, ${characterUrl ? 'character interacting naturally' : 'clean and focused'}

Generate a detailed image generation prompt for a 2048x2048px poster.`,
        file_urls: fileUrls
      });

      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: posterPrompt
      });

      setPoster(url);
      return url;
    }
  });

  const generateVideoPlanMutation = useMutation({
    mutationFn: async () => {
      if (!poster) throw new Error("Generate poster first");

      const plan = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this product poster, create a ${sceneCount}-scene video storyboard for a ${style} advertisement.

For each scene provide:
- Scene number (1-${sceneCount})
- Description (what happens in 15 seconds)
- Camera movement (pan, zoom, static, dolly, etc)
- Lighting (golden hour, studio, dramatic, natural, etc)
- Key elements to show
- Duration in seconds

Return as JSON array.`,
        file_urls: [poster],
        response_json_schema: {
          type: "object",
          properties: {
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  scene_number: { type: "number" },
                  description: { type: "string" },
                  camera_movement: { type: "string" },
                  lighting: { type: "string" },
                  key_elements: { type: "string" },
                  duration: { type: "number" }
                }
              }
            }
          }
        }
      });

      setVideoPlan(plan.scenes);
      return plan.scenes;
    }
  });

  const generateScenesMutation = useMutation({
    mutationFn: async () => {
      if (!videoPlan) throw new Error("Generate video plan first");

      const job = await base44.entities.Job.create({
        app_type: "video",
        base_image_url: poster,
        settings: {
          scene_count: sceneCount,
          style: style,
          video_plan: videoPlan
        },
        total_variations: videoPlan.length,
        status: "processing"
      });

      for (let i = 0; i < videoPlan.length; i++) {
        const scene = videoPlan[i];

        const variation = await base44.entities.Variation.create({
          job_id: job.id,
          sequence_number: scene.scene_number,
          instruction: `Scene ${scene.scene_number}: ${scene.description}`,
          status: "generating"
        });

        try {
          const scenePrompt = await base44.integrations.Core.InvokeLLM({
            prompt: `Create an image generation prompt for this video scene:

Scene ${scene.scene_number}:
Description: ${scene.description}
Camera: ${scene.camera_movement}
Lighting: ${scene.lighting}
Key Elements: ${scene.key_elements}

Style: ${style}, cinematic quality, 4K video frame
This should look like a still from a professional advertisement video.
Generate a detailed 2048x2048px image prompt.`
          });

          await base44.entities.Variation.update(variation.id, {
            prompt_generated: scenePrompt
          });

          const { url } = await base44.integrations.Core.GenerateImage({
            prompt: scenePrompt
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
            asset_type: "video_plan",
            name: `Scene ${scene.scene_number}: ${scene.description.substring(0, 50)}`
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

      setCurrentJobId(job.id);
      queryClient.invalidateQueries(['job', job.id]);
      queryClient.invalidateQueries(['variations', job.id]);
      
      return job;
    }
  });

  const downloadVideoPlan = () => {
    const planData = {
      poster_url: poster,
      style: style,
      scenes: videoPlan
    };
    
    const blob = new Blob([JSON.stringify(planData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'video-plan.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Video Storyboard</h1>
              <p className="text-slate-400">Create cinematic video storyboards with AI</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Upload Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Product Image *</Label>
                  <FileUploadZone onFileSelect={setProductImage} />
                </div>
                <div>
                  <Label className="text-white mb-2 block">Background Scene *</Label>
                  <FileUploadZone onFileSelect={setBackgroundImage} />
                </div>
                <div>
                  <Label className="text-white mb-2 block">Character/Model (Optional)</Label>
                  <FileUploadZone onFileSelect={setCharacterImage} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Video Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Number of Scenes</Label>
                  <Select value={sceneCount} onValueChange={setSceneCount}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Scenes</SelectItem>
                      <SelectItem value="5">5 Scenes</SelectItem>
                      <SelectItem value="7">7 Scenes</SelectItem>
                      <SelectItem value="8">8 Scenes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white mb-2 block">Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="product-demo">Product Demo</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="dramatic">Dramatic</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={() => generatePosterMutation.mutate()}
                disabled={!productImage || !backgroundImage || generatePosterMutation.isPending}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 text-lg font-semibold"
              >
                {generatePosterMutation.isPending ? "Generating..." : "1. Generate Poster"}
              </Button>

              <Button
                onClick={() => generateVideoPlanMutation.mutate()}
                disabled={!poster || generateVideoPlanMutation.isPending}
                variant="outline"
                className="w-full border-slate-700 hover:bg-slate-800 py-4"
              >
                {generateVideoPlanMutation.isPending ? "Creating..." : "2. Create Video Plan"}
              </Button>

              <Button
                onClick={() => generateScenesMutation.mutate()}
                disabled={!videoPlan || generateScenesMutation.isPending}
                variant="outline"
                className="w-full border-slate-700 hover:bg-slate-800 py-4"
              >
                {generateScenesMutation.isPending ? "Generating..." : "3. Generate Scene Images"}
              </Button>
            </div>

            {(generatePosterMutation.isError || generateVideoPlanMutation.isError || generateScenesMutation.isError) && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">
                  {generatePosterMutation.error?.message || 
                   generateVideoPlanMutation.error?.message || 
                   generateScenesMutation.error?.message}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {poster && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Cinematic Poster</CardTitle>
                </CardHeader>
                <CardContent>
                  <img src={poster} alt="Poster" className="w-full rounded-lg" />
                </CardContent>
              </Card>
            )}

            {videoPlan && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Film className="w-5 h-5" />
                      Video Plan
                    </CardTitle>
                    <Button
                      onClick={downloadVideoPlan}
                      size="sm"
                      variant="outline"
                      className="border-slate-700 hover:bg-slate-800"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download JSON
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {videoPlan.map((scene) => (
                      <div key={scene.scene_number} className="p-4 bg-slate-800/50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-white">Scene {scene.scene_number}</h4>
                          <span className="text-sm text-slate-400">{scene.duration}s</span>
                        </div>
                        <p className="text-sm text-slate-300 mb-2">{scene.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                            📹 {scene.camera_movement}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                            💡 {scene.lighting}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {currentJob && (
              <>
                <JobProgress job={currentJob} variations={variations} />
                {variations.length > 0 && (
                  <h3 className="text-xl font-semibold text-white">Scene Images</h3>
                )}
                <OutputGrid variations={variations} />
              </>
            )}

            {!poster && !videoPlan && !currentJob && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-24">
                  <div className="text-center text-slate-400">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Follow the steps to create your video storyboard</p>
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
