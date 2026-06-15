"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BlueTitle } from "./reusables";
import { PRICING_PLANS } from "@/lib/constants";
import { PricingCard } from "./PricingCard";

interface PricingModalProps {
  children: React.ReactNode;
  reason?: "credits" | "upgrade";
}

export function PricingModal({
  children,
  reason = "upgrade",
}: PricingModalProps) {
  const title =
    reason === "credits" ? "You're out of credits" : "Upgrade your plan";
  const description =
    reason === "credits"
      ? "You've used all your credits. Upgrade to keep building."
      : "Choose a plan that fits how much you build.";

  return (
    <Dialog>
      <DialogTrigger asChild className="cursor-pointer">
        {children}
      </DialogTrigger>
      <DialogContent className="border-white/8 bg-[#0f0f0f] p-0 text-white sm:max-w-5xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="font-serif text-xl tracking-tight text-white/90">
            <BlueTitle className="text-4xl">{title}</BlueTitle>
          </DialogTitle>
          <DialogDescription className="text-sm text-white/35">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 px-6 pb-6 sm:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              compact
              ctaLabel="Upgrade"
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
