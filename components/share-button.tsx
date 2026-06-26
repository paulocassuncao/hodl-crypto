"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Shares the current page URL via the Web Share sheet when available, falling
 * back to copying the link to the clipboard. The URL already encodes state
 * (e.g. the compare page's ?ids), so no extra props are needed.
 */
export const ShareButton = ({ title }: { title?: string }): React.ReactNode => {
  const [copied, setCopied] = useState(false);

  const handleShare = async (): Promise<void> => {
    const url = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: title ?? document.title, url });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handleShare}
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      <span className="hidden sm:inline">Share</span>
    </Button>
  );
};
