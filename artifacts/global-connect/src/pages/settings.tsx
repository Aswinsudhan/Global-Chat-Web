import { Layout } from "@/components/layout";
import { useTheme } from "@/hooks/use-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STORE_WALLPAPER_KEY } from "@/lib/constants";
import { useState } from "react";
import { Monitor, Moon, Sun, Image as ImageIcon, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRESET_WALLPAPERS = [
  { name: "Default", value: "" },
  { name: "Midnight Mesh", value: "linear-gradient(to right, #0f2027, #203a43, #2c5364)" },
  { name: "Sunset", value: "linear-gradient(to right, #ff4e50, #f9d423)" },
  { name: "Ocean", value: "linear-gradient(to right, #2193b0, #6dd5ed)" },
  { name: "Subtle Grid", value: "linear-gradient(90deg, var(--color-border) 1px, transparent 1px), linear-gradient(var(--color-border) 1px, transparent 1px)" }
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [wallpaperUrl, setWallpaperUrl] = useState("");
  const [currentWallpaper, setCurrentWallpaper] = useState(() => localStorage.getItem(STORE_WALLPAPER_KEY) || "");

  const handleApplyWallpaper = (url: string) => {
    localStorage.setItem(STORE_WALLPAPER_KEY, url);
    setCurrentWallpaper(url);
    toast({
      title: "Wallpaper updated",
      description: "Your chat background has been changed.",
    });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wallpaperUrl) {
      handleApplyWallpaper(wallpaperUrl);
      setWallpaperUrl("");
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto bg-muted/20">
        <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">Customize your Global Connect experience.</p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Appearance
                </CardTitle>
                <CardDescription>Select a theme for the application interface.</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={theme} 
                  onValueChange={(val) => setTheme(val as 'light' | 'dark' | 'system')}
                  className="grid grid-cols-3 gap-4"
                >
                  <Label
                    htmlFor="theme-light"
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary ${theme === 'light' ? 'border-primary' : ''}`}
                  >
                    <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                    <Sun className="mb-3 h-6 w-6" />
                    Light
                  </Label>
                  <Label
                    htmlFor="theme-dark"
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary ${theme === 'dark' ? 'border-primary' : ''}`}
                  >
                    <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                    <Moon className="mb-3 h-6 w-6" />
                    Dark
                  </Label>
                  <Label
                    htmlFor="theme-system"
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary ${theme === 'system' ? 'border-primary' : ''}`}
                  >
                    <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                    <Monitor className="mb-3 h-6 w-6" />
                    System
                  </Label>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Chat Wallpaper
                </CardTitle>
                <CardDescription>Customize the background of your chat rooms.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Presets</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {PRESET_WALLPAPERS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handleApplyWallpaper(preset.value)}
                        className={`group relative h-20 rounded-lg overflow-hidden border-2 transition-all ${currentWallpaper === preset.value ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                        style={{
                          background: preset.value || "var(--color-background)",
                          backgroundSize: "20px 20px"
                        }}
                      >
                        <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-medium text-white truncate">{preset.name}</span>
                        </div>
                        {currentWallpaper === preset.value && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Custom Image URL</h4>
                  <form onSubmit={handleUrlSubmit} className="flex gap-3">
                    <Input 
                      placeholder="https://example.com/image.jpg" 
                      value={wallpaperUrl}
                      onChange={(e) => setWallpaperUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!wallpaperUrl.trim()}>Apply</Button>
                  </form>
                  <p className="text-xs text-muted-foreground mt-2">Paste a direct link to an image. We recommend high-resolution landscape images.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
