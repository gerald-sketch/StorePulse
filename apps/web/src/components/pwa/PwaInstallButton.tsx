import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { usePwaStore } from "@/lib/pwa-store";
import { cn } from "@/lib/utils";

interface PwaInstallButtonProps {
  className?: string;
  size?: ButtonProps["size"];
  iconOnly?: boolean;
}

export function PwaInstallButton({
  className,
  size = "sm",
  iconOnly = false,
}: PwaInstallButtonProps) {
  const installPrompt = usePwaStore((state) => state.installPrompt);
  const setInstallPrompt = usePwaStore((state) => state.setInstallPrompt);
  const [isInstalled, setIsInstalled] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && navigator.standalone === true)),
  );

  useEffect(() => {
    const markInstalled = () => setIsInstalled(true);
    window.addEventListener("appinstalled", markInstalled);
    return () => window.removeEventListener("appinstalled", markInstalled);
  }, []);

  async function install() {
    if (!installPrompt) {
      const userAgent = navigator.userAgent;
      const instructions = /iPhone|iPad|iPod/i.test(userAgent)
        ? "Tap Share, then choose “Add to Home Screen.”"
        : /Android/i.test(userAgent)
          ? "Open your browser menu and choose “Install app” or “Add to Home screen.”"
          : "Open your browser menu and choose “Install StorePulse” or “Install app.”";
      toast.info("Install StorePulse", { description: instructions });
      return;
    }

    const prompt = installPrompt;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
    } catch (error) {
      console.error("Unable to prompt for app installation", error);
      toast.error("Could not open the install prompt. Use your browser menu to install StorePulse.");
    } finally {
      setInstallPrompt(null);
    }
  }

  if (isInstalled) return null;

  return (
    <Button
      size={size}
      variant="outline"
      className={cn(
        "h-9 rounded-xl border-slate-200 px-3 text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800",
        iconOnly && "h-10 w-10 p-0",
        className,
      )}
      onClick={install}
      aria-label={iconOnly ? "Install StorePulse app" : undefined}
      title={iconOnly ? "Install StorePulse app" : undefined}
    >
      <Download className={cn("h-3.5 w-3.5", !iconOnly && "mr-1.5")} />
      {!iconOnly && "Install app"}
    </Button>
  );
}
