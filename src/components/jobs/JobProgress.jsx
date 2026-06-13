import React from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function JobProgress({ job, variations = [] }) {
  const progress = job.total_variations > 0 
    ? Math.round((job.completed_count / job.total_variations) * 100)
    : 0;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />;
    }
  };

  if (job.status === 'complete') {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-white">Job Complete!</p>
              <p className="text-sm text-slate-400">
                {job.completed_count} of {job.total_variations} variations generated
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (job.status === 'failed') {
    return (
      <Card className="bg-slate-900/50 border-red-900/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-white">Job Failed</p>
              <p className="text-sm text-red-400">{job.error_message || "Unknown error"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            Generating Variations...
          </CardTitle>
          <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
            {progress}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {job.completed_count} of {job.total_variations} complete
          </span>
          {job.failed_count > 0 && (
            <span className="text-red-400">{job.failed_count} failed</span>
          )}
        </div>

        {variations.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-slate-300">Status by variation:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {variations.map((variation) => (
                <div
                  key={variation.id}
                  className="flex items-center justify-between p-2 rounded bg-slate-800/50 text-sm"
                >
                  <span className="text-slate-300 truncate flex-1">
                    {variation.instruction}
                  </span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(variation.status)}
                    <span className="text-slate-400 text-xs capitalize">
                      {variation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}