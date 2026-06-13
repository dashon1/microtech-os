import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  Sparkles, 
  Scan, 
  Maximize, 
  Eraser, 
  Wand2, 
  ArrowRight, 
  Upload, 
  Download,
  Check,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AITools() {
  const [activeTool, setActiveTool] = useState("upscale");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const tools = [
    {
      id: "upscale",
      name: "Smart Upscaler",
      description: "Enhance resolution up to 4x using AI",
      icon: Maximize,
      task: "upscale"
    },
    {
      id: "remove_bg",
      name: "Background Remover",
      description: "Instantly remove backgrounds from any image",
      icon: Eraser,
      task: "remove_bg"
    },
    {
      id: "extract_brand",
      name: "Brand DNA",
      description: "Extract color palette and style from an image",
      icon: Scan,
      task: "extract_brand"
    }
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setResultImage(null);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setResultImage(null);

    try {
      // 1. Upload File
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedImage });

      // 2. Call AI Tool
      const currentTool = tools.find(t => t.id === activeTool);
      
      const res = await base44.functions.invoke('ai_tools', {
        task: currentTool.task,
        imageUrl: file_url
      });

      if (res.data.error) throw new Error(res.data.error);

      if (activeTool === 'extract_brand') {
        setResultImage(res.data); // It's JSON data
      } else {
        setResultImage(res.data.url);
      }

    } catch (error) {
      console.error("Processing failed:", error);
      alert("Operation failed: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">AI Utility Belt</h1>
            <p className="text-slate-500 dark:text-slate-400">Professional image enhancement and analysis tools</p>
        </div>

        <Tabs value={activeTool} onValueChange={setActiveTool} className="space-y-8">
          <TabsList className="bg-white dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full justify-start h-auto flex-wrap">
            {tools.map(tool => (
              <TabsTrigger 
                key={tool.id} 
                value={tool.id}
                className="flex items-center gap-3 px-6 py-4 rounded-lg data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all"
              >
                <tool.icon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">{tool.name}</div>
                  <div className="text-xs opacity-70 font-normal">{tool.description}</div>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Input Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center transition-colors hover:border-indigo-500/50">
                    {imagePreview ? (
                        <div className="relative">
                            <img src={imagePreview} alt="Preview" className="max-h-96 mx-auto rounded shadow-lg" />
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="absolute top-2 right-2"
                                onClick={() => {
                                    setSelectedImage(null);
                                    setImagePreview(null);
                                    setResultImage(null);
                                }}
                            >
                                Clear
                            </Button>
                        </div>
                    ) : (
                        <label className="cursor-pointer block">
                            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                            <span className="text-slate-900 dark:text-white font-medium">Click to upload</span>
                            <input type="file" onChange={handleFileSelect} className="hidden" accept="image/*" />
                        </label>
                    )}
                </div>

                <Button 
                    onClick={processImage} 
                    disabled={!selectedImage || isProcessing}
                    className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white h-12 text-lg"
                >
                    {isProcessing ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                    ) : (
                        <><Sparkles className="w-5 h-5 mr-2" /> Run {tools.find(t => t.id === activeTool).name}</>
                    )}
                </Button>
              </CardContent>
            </Card>

            {/* Output Section */}
            <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                {resultImage ? (
                    activeTool === 'extract_brand' ? (
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                {['primary_color', 'secondary_color', 'accent_color'].map(key => (
                                    <div key={key} className="flex-1">
                                        <div 
                                            className="h-24 rounded-lg shadow-inner mb-2" 
                                            style={{ backgroundColor: resultImage[key] || '#ccc' }} 
                                        />
                                        <p className="text-xs text-slate-500 uppercase">{key.replace('_', ' ')}</p>
                                        <p className="font-mono font-bold text-slate-900 dark:text-white">{resultImage[key]}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2 text-slate-900 dark:text-white">Style Preferences</h4>
                                <pre className="text-sm text-slate-600 dark:text-slate-300 overflow-auto">
                                    {JSON.stringify(resultImage.style_preferences, null, 2)}
                                </pre>
                            </div>
                            <Button className="w-full" onClick={() => window.open(createPageUrl('BrandKits'), '_self')}>
                                Save to Brand Kits
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <img src={resultImage} alt="Result" className="w-full rounded-lg shadow-lg mb-4 bg-[url('https://media.istockphoto.com/id/1146660600/vector/transparent-background-grid-seamless-pattern.jpg?s=612x612&w=0&k=20&c=KxH_qC0T_Fad1d0a5f0Zg3r6Yq3w5Q3u6e7f_6w_6w=')] bg-contain" />
                            <Button className="w-full" variant="outline" onClick={() => window.open(resultImage, '_blank')}>
                                <Download className="w-4 h-4 mr-2" /> Download Result
                            </Button>
                        </div>
                    )
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>Output will appear here</p>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Tabs>
      </div>
    </div>
  );
}