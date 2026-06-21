"use client";

import { Zap } from "lucide-react";
import { PricingModal } from "@/components/PricingModal";

interface CreditsBadgeProps {
  credits: number;
  limit: number;
}

export function CreditsBadge({ credits, limit }: CreditsBadgeProps) {
  return (
    <PricingModal reason="upgrade">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white/70 border border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
      >
        <Zap className="h-3 w-3 fill-white/70" />
        {credits} 
        {/* / {limit} Credits */}
      </button>
    </PricingModal>
  );
}
