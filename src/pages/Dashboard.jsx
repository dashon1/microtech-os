import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Image, 
  Megaphone, 
  Package, 
  Video, 
  MapPin,
  ArrowRight,
  TrendingUp,
  Layers,
  Clock,
  CheckCircle2,
  Loader2,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const apps = [
  {
    id: "illustration",
    title: "Illustration Generator",
    description: "Generate consistent mascot and character variations",
    icon: Image,
    gradient: "from-blue-500 to-cyan-500",
    url: createPageUrl("IllustrationGenerator"),
  },
  {
    id: "ad_editor",
    title: "Ad Multi-Editor",
    description: "Create campaign variations at scale",
    icon: Megaphone,
    gradient: "from-purple-500 to-pink-500",
    url: createPageUrl("AdEditor"),
  },
  {
    id: "mockup",
    title: "MockupMaster",
    description: "Generate product mockups instantly",
    icon: Package,
    gradient: "from-orange-500 to-red-500",
    url: createPageUrl("MockupMaster"),
  },
  {
    id: "video",
    title: "Video Storyboard",
    description: "Create cinematic video storyboards with AI",
    icon: Video,
    gradient: "from-green-500 to-emerald-500",
    url: createPageUrl("VideoStoryboard"),
  },
  {
    id: "billboard",
    title: "Billboard Placements",
    description: "Simulate realistic billboard placements",
    icon: MapPin,
    gradient: "from-yellow-500 to-amber-500",
    url: createPageUrl("BillboardPlacements"),
  },
  {
    id: "video_gen",
    title: "Video Generator",
    description: "Unified Video Model Builder (Sora, Kling, etc.)",
    icon: Video,
    gradient: "from-emerald-400 to-cyan-500",
    url: createPageUrl("VideoGenerator"),
    },
    {
    id: "ai_tools",
    title: "AI Utility Belt",
    description: "Upscale, Remove BG, Extract Brand DNA",
    icon: Sparkles,
    gradient: "from-slate-500 to-slate-700",
    url: createPageUrl("AITools"),
    },
    ];

export default function Dashboard() {
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['recentJobs'],
    queryFn: async () => {
      const allJobs = await base44.entities.Job.list('-created_date', 10);
      return allJobs || [];
    },
    initialData: [],
  });

  const { data: assets } = useQuery({
    queryKey: ['assetCount'],
    queryFn: async () => {
      const allAssets = await base44.entities.Asset.list();
      return allAssets || [];
    },
    initialData: [],
  });

  const completedJobs = jobs.filter(j => j.status === 'complete').length;
  const processingJobs = jobs.filter(j => j.status === 'processing').length;

  const getAppTitle = (appType) => {
    const app = apps.find(a => a.id === appType);
    return app ? app.title : appType;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'processing':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto p-8">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="inline-block mb-4">
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 px-4 py-1">
              Professional AI Tools
            </Badge>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            AI Microtech OS
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl">
            Your complete suite of AI-powered content creation tools. Generate illustrations, 
            edit ads, create mockups, and more—all in one platform.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Jobs</CardTitle>
              <Layers className="w-4 h-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{jobs.length}</div>
              <p className="text-xs text-slate-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Assets</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{assets.length}</div>
              <p className="text-xs text-slate-500 mt-1">In your gallery</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl hover:shadow-lg hover:shadow-pink-500/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Success Rate</CardTitle>
              <TrendingUp className="w-4 h-4 text-pink-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {jobs.length > 0 ? Math.round((completedJobs / jobs.length) * 100) : 0}%
              </div>
              <p className="text-xs text-slate-500 mt-1">{completedJobs} completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Apps Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">AI Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <Link key={app.id} to={app.url}>
                <Card className="group bg-slate-900/50 border-slate-800 backdrop-blur-xl hover:bg-slate-900/80 hover:border-indigo-500/50 transition-all duration-300 cursor-pointer h-full hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1">
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <app.icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-white group-hover:text-indigo-400 transition-colors">
                      {app.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400 text-sm mb-4">{app.description}</p>
                    <div className="flex items-center text-indigo-400 text-sm font-medium group-hover:gap-2 transition-all">
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Jobs */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Jobs</h2>
            <Link to={createPageUrl("Gallery")} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1">
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {jobsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
              <CardContent className="py-12">
                <div className="text-center">
                  <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">No jobs yet</p>
                  <p className="text-slate-500 text-sm">Start creating with one of our AI tools above</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job) => (
                <Card key={job.id} className="bg-slate-900/50 border-slate-800 backdrop-blur-xl hover:bg-slate-900/80 transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                          {job.base_image_url && (
                            <img 
                              src={job.base_image_url} 
                              alt="Job" 
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white mb-1">{getAppTitle(job.app_type)}</p>
                          <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {job.total_variations} variations
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(job.created_date), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(job.status)} border`}>
                        {job.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {job.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}