import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Palette, Trash2, Check, Edit2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUploadZone from "../components/upload/FileUploadZone";

export default function BrandKits() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    primary_color: "#6366F1",
    secondary_color: "#8B5CF6",
    accent_color: "#EC4899",
    logo_url: "",
    style_preferences: {
      line_weight: "medium",
      render_style: "flat",
      detail_level: "moderate"
    },
    is_default: false
  });
  const [logoFile, setLogoFile] = useState(null);

  const { data: brandKits = [], isLoading } = useQuery({
    queryKey: ['brandKits'],
    queryFn: async () => {
      const kits = await base44.entities.BrandKit.list('-created_date');
      return kits || [];
    },
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      let logoUrl = data.logo_url;
      if (logoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: logoFile });
        logoUrl = file_url;
      }

      if (editingKit) {
        await base44.entities.BrandKit.update(editingKit.id, {
          ...data,
          logo_url: logoUrl
        });
      } else {
        await base44.entities.BrandKit.create({
          ...data,
          logo_url: logoUrl
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['brandKits']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (kitId) => {
      await base44.entities.BrandKit.delete(kitId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['brandKits']);
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (kitId) => {
      // Unset all defaults first
      const allKits = await base44.entities.BrandKit.list();
      for (const kit of allKits) {
        if (kit.is_default && kit.id !== kitId) {
          await base44.entities.BrandKit.update(kit.id, { is_default: false });
        }
      }
      // Set new default
      await base44.entities.BrandKit.update(kitId, { is_default: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['brandKits']);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      primary_color: "#6366F1",
      secondary_color: "#8B5CF6",
      accent_color: "#EC4899",
      logo_url: "",
      style_preferences: {
        line_weight: "medium",
        render_style: "flat",
        detail_level: "moderate"
      },
      is_default: false
    });
    setLogoFile(null);
    setEditingKit(null);
  };

  const handleEdit = (kit) => {
    setEditingKit(kit);
    setFormData({
      name: kit.name,
      description: kit.description || "",
      primary_color: kit.primary_color || "#6366F1",
      secondary_color: kit.secondary_color || "#8B5CF6",
      accent_color: kit.accent_color || "#EC4899",
      logo_url: kit.logo_url || "",
      style_preferences: kit.style_preferences || {
        line_weight: "medium",
        render_style: "flat",
        detail_level: "moderate"
      },
      is_default: kit.is_default || false
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            to={createPageUrl("Dashboard")}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Brand Kits</h1>
              <p className="text-slate-400">Manage your brand colors, logos, and style preferences</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Brand Kit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {editingKit ? 'Edit Brand Kit' : 'Create New Brand Kit'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                  <div>
                    <Label className="text-white">Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Company Brand"
                      className="bg-slate-900/50 border-slate-700 text-white mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white">Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                      className="bg-slate-900/50 border-slate-700 text-white mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-white">Primary Color</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="w-16 h-10 p-1 bg-slate-900/50 border-slate-700"
                        />
                        <Input
                          type="text"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="flex-1 bg-slate-900/50 border-slate-700 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-white">Secondary Color</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="color"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="w-16 h-10 p-1 bg-slate-900/50 border-slate-700"
                        />
                        <Input
                          type="text"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="flex-1 bg-slate-900/50 border-slate-700 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-white">Accent Color</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="color"
                          value={formData.accent_color}
                          onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                          className="w-16 h-10 p-1 bg-slate-900/50 border-slate-700"
                        />
                        <Input
                          type="text"
                          value={formData.accent_color}
                          onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                          className="flex-1 bg-slate-900/50 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-white mb-2 block">Logo (Optional)</Label>
                    <FileUploadZone onFileSelect={setLogoFile} />
                    {formData.logo_url && !logoFile && (
                      <img src={formData.logo_url} alt="Current logo" className="mt-2 h-16 object-contain" />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-white">Line Weight</Label>
                      <Select
                        value={formData.style_preferences.line_weight}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          style_preferences: { ...formData.style_preferences, line_weight: value }
                        })}
                      >
                        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="thin">Thin</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="thick">Thick</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white">Render Style</Label>
                      <Select
                        value={formData.style_preferences.render_style}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          style_preferences: { ...formData.style_preferences, render_style: value }
                        })}
                      >
                        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat</SelectItem>
                          <SelectItem value="3d">3D</SelectItem>
                          <SelectItem value="cel-shaded">Cel-Shaded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white">Detail Level</Label>
                      <Select
                        value={formData.style_preferences.detail_level}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          style_preferences: { ...formData.style_preferences, detail_level: value }
                        })}
                      >
                        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                      className="border-slate-700 hover:bg-slate-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    >
                      {createMutation.isPending ? "Saving..." : editingKit ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading brand kits...</p>
          </div>
        ) : brandKits.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-24">
              <div className="text-center text-slate-400">
                <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No brand kits yet</p>
                <p className="text-sm">Create your first brand kit to get started</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brandKits.map((kit) => (
              <Card key={kit.id} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white flex items-center gap-2">
                        {kit.name}
                        {kit.is_default && (
                          <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full">
                            Default
                          </span>
                        )}
                      </CardTitle>
                      {kit.description && (
                        <p className="text-sm text-slate-400 mt-1">{kit.description}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    {kit.primary_color && (
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-slate-700"
                        style={{ backgroundColor: kit.primary_color }}
                        title="Primary"
                      />
                    )}
                    {kit.secondary_color && (
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-slate-700"
                        style={{ backgroundColor: kit.secondary_color }}
                        title="Secondary"
                      />
                    )}
                    {kit.accent_color && (
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-slate-700"
                        style={{ backgroundColor: kit.accent_color }}
                        title="Accent"
                      />
                    )}
                  </div>

                  {kit.logo_url && (
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <img src={kit.logo_url} alt="Logo" className="h-12 object-contain" />
                    </div>
                  )}

                  {kit.style_preferences && (
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>Line: {kit.style_preferences.line_weight}</p>
                      <p>Style: {kit.style_preferences.render_style}</p>
                      <p>Detail: {kit.style_preferences.detail_level}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {!kit.is_default && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDefaultMutation.mutate(kit.id)}
                        className="flex-1 border-slate-700 hover:bg-slate-800"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(kit)}
                      className="flex-1 border-slate-700 hover:bg-slate-800"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(kit.id)}
                      className="border-slate-700 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}