import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, FileJson, ArrowRight, Copy, CheckCircle2 } from "lucide-react";

export default function VideoGenerator() {
  const [model, setModel] = useState("kling-v1-5-pro");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("16:9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [jsonPreview, setJsonPreview] = useState("");

  const models = [
    { id: "sora-2", name: "Sora 2 (Preview)" },
    { id: "wan-2-5", name: "Wan 2.5" },
    { id: "hailuo-01", name: "Hailuo 01 (MiniMax)" },
    { id: "hunyuan", name: "Hunyuan Video" },
    { id: "kling-v1-5-pro", name: "Kling AI v1.5 Pro" },
    { id: "luma-dream-machine", name: "Luma Dream Machine" },
    { id: "veo-3-1", name: "Veo 3.1" },
  ];

  // Update JSON preview whenever inputs change
  React.useEffect(() => {
    const payload = {
      task: "video_generation",
      model: model,
      params: {
        options: {
          prompt: prompt,
          duration: duration,
          resolution: resolution
        }
      }
    };
    setJsonPreview(JSON.stringify(payload, null, 2));
  }, [model, prompt, duration, resolution]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke('generateMedia', JSON.parse(jsonPreview));
      setResult(response.data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyJson = () => {
    navigator.clipboard.writeText(jsonPreview);
    // Could show toast here
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Video Model Builder
          </h1>
          <p className="text-slate-400">
            Unified interface for video generation models. Build requests, test endpoints, and generate video assets.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Builder Column */}
          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {models.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-300">Prompt</Label>
                  <Textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the video you want to generate..."
                    className="bg-slate-950 border-slate-800 text-white mt-1 min-h-[120px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Duration (sec)</Label>
                    <Input 
                      type="number" 
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white mt-1"
                      min={1} max={10}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Aspect Ratio</Label>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="16:9">16:9 Landscape</SelectItem>
                        <SelectItem value="1:1">1:1 Square</SelectItem>
                        <SelectItem value="9:16">9:16 Portrait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleGenerate}
                  disabled={!prompt || isGenerating}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-semibold py-6"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Run Request
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-slate-400" />
                  <CardTitle className="text-base text-slate-300">JSON Payload</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={copyJson} className="text-slate-400 hover:text-white">
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto">
                  {jsonPreview}
                </pre>
              </CardContent>
            </Card>
          </div>

          {/* Results Column */}
          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800 h-full min-h-[500px]">
              <CardHeader>
                <CardTitle className="text-white">Output</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-[400px]">
                {result ? (
                  result.error ? (
                    <div className="text-center text-red-400 p-6 bg-red-500/10 rounded-xl">
                      <p className="font-semibold mb-2">Generation Failed</p>
                      <p className="text-sm">{result.error}</p>
                    </div>
                  ) : result.video_url ? (
                    <div className="w-full space-y-4">
                      <video 
                        src={result.video_url} 
                        controls 
                        autoPlay 
                        loop 
                        className="w-full rounded-lg shadow-2xl border border-slate-700"
                      />
                      <div className="flex items-center justify-between text-sm text-slate-400 px-2">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Completed
                        </span>
                        <Badge variant="outline" className="border-slate-700">
                          {result.provider} / {result.model}
                        </Badge>
                      </div>
                      {result.note && (
                        <p className="text-xs text-yellow-500/80 text-center">
                          Note: {result.note}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center space-y-4 max-w-md">
                      <div className="p-4 bg-slate-800/50 rounded-lg text-left text-xs font-mono text-slate-300 overflow-auto max-h-60">
                        {JSON.stringify(result, null, 2)}
                      </div>
                      <p className="text-sm text-slate-400">
                        Request sent. Check the JSON response above for status or queue details.
                      </p>
                    </div>
                  )
                ) : isGenerating ? (
                  <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-slate-300 font-medium">Processing Request...</p>
                    <p className="text-sm text-slate-500 mt-2">This may take 1-3 minutes depending on the model.</p>
                  </div>
                ) : (
                  <div className="text-center text-slate-500">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Ready to generate</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}