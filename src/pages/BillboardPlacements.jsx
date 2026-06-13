
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUploadZone from "../components/upload/FileUploadZone";
import JobProgress from "../components/jobs/JobProgress";
import OutputGrid from "../components/output/OutputGrid";

const PRESET_LOCATIONS = [
  { id: "times-square", name: "Times Square", description: "Iconic NYC digital billboard" },
  { id: "london-bus", name: "London Bus", description: "Double-decker bus advertisement" },
  { id: "tokyo-metro", name: "Tokyo Metro", description: "Subway station display" },
  { id: "nyc-subway", name: "NYC Subway", description: "Underground train platform" },
  { id: "mall", name: "Shopping Mall", description: "Indoor mall billboard" },
  { id: "airport", name: "Airport Terminal", description: "Departure lounge display" },
  { id: "urban-wall", name: "Urban Wall", description: "Building-side advertisement" },
  { id: "highway", name: "Highway Billboard", description: "Roadside large format" },
];

export default function BillboardPlacements() {
  const queryClient = useQueryClient();
  const [posterImage, setPosterImage] = useState(null);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [customLocation, setCustomLocation] = useState("");
  const [resolution, setResolution] = useState("4096");
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

  const toggleLocation = (locationId) => {
    if (selectedLocations.includes(locationId)) {
      setSelectedLocations(selectedLocations.filter(id => id !== locationId));
    } else {
      setSelectedLocations([...selectedLocations, locationId]);
    }
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!posterImage) throw new Error("Please upload a poster or product image");
      
      const allLocations = [...selectedLocations];
      if (customLocation.trim()) {
        allLocations.push(`custom:${customLocation.trim()}`);
      }
      
      if (allLocations.length === 0) {
        throw new Error("Please select at least one location or add a custom location");
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file: posterImage });

      const job = await base44.entities.Job.create({
        app_type: "billboard",
        base_image_url: file_url,
        settings: {
          locations: allLocations,
          resolution: resolution
        },
        total_variations: allLocations.length,
        status: "processing"
      });

      for (let i = 0; i < allLocations.length; i++) {
        const locationId = allLocations[i];
        let locationInfo;
        
        if (locationId.startsWith('custom:')) {
          locationInfo = {
            id: locationId,
            name: "Custom Location",
            description: locationId.replace('custom:', '')
          };
        } else {
          locationInfo = PRESET_LOCATIONS.find(l => l.id === locationId);
        }

        const variation = await base44.entities.Variation.create({
          job_id: job.id,
          sequence_number: i + 1,
          instruction: `${locationInfo.name}: ${locationInfo.description}`,
          status: "generating"
        });

        try {
          const placementPrompt = await base44.integrations.Core.InvokeLLM({
            prompt: `Create a photorealistic billboard placement visualization:

Location: ${locationInfo.description}
Resolution: ${resolution}x${resolution}px (4K quality)

Requirements:
- Place the provided poster/advertisement in this location
- Photorealistic environment and lighting
- Natural perspective and viewing angle
- Realistic reflections, shadows, and weathering
- Preserve all text clarity and readability
- Professional advertising photography quality
- Make it look like a real photograph of the billboard in this location
- Include environmental context (people, traffic, architecture as appropriate)

${locationId.startsWith('custom:') ? `Custom location details: ${locationInfo.description}` : `Standard ${locationInfo.name} setting with typical characteristics`}

Generate a detailed image generation prompt for this billboard placement.`
          });

          await base44.entities.Variation.update(variation.id, {
            prompt_generated: placementPrompt
          });

          const { url } = await base44.integrations.Core.GenerateImage({
            prompt: placementPrompt
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
            asset_type: "billboard",
            name: `${locationInfo.name} - Billboard Placement`
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

  const totalLocations = selectedLocations.length + (customLocation.trim() ? 1 : 0);

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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Billboard Placements</h1>
              <p className="text-slate-400">Simulate realistic billboard placements</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Your Poster/Product</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploadZone onFileSelect={setPosterImage} />
                <p className="text-sm text-slate-400 mt-2">
                  Upload your poster, ad, or product image
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Preset Locations</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  {selectedLocations.length} location{selectedLocations.length !== 1 ? 's' : ''} selected
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_LOCATIONS.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => toggleLocation(location.id)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        selectedLocations.includes(location.id)
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <MapPin className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        {selectedLocations.includes(location.id) && (
                          <Check className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-white text-sm font-medium mb-1">{location.name}</p>
                      <p className="text-xs text-slate-400">{location.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Custom Location (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="text-white mb-2 block">Describe your custom location</Label>
                <Textarea
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  placeholder="e.g., Rooftop billboard in downtown Paris with Eiffel Tower in background"
                  className="min-h-[100px] bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Quality Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="text-white mb-2 block">Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2048">2048×2048 (Standard)</SelectItem>
                    <SelectItem value="4096">4096×4096 (4K)</SelectItem>
                    <SelectItem value="8192">8192×8192 (8K Ultra)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!posterImage || totalLocations === 0 || generateMutation.isPending}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white py-6 text-lg font-semibold"
            >
              {generateMutation.isPending ? "Generating..." : `Generate ${totalLocations} Placement${totalLocations !== 1 ? 's' : ''}`}
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
                  <h3 className="text-xl font-semibold text-white">Placements</h3>
                )}
                <OutputGrid variations={variations} />
              </>
            ) : (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-24">
                  <div className="text-center text-slate-400">
                    <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Your billboard placements will appear here</p>
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
