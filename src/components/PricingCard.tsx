"use client";

import { Show, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { CheckoutButton } from "@clerk/nextjs/experimental";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlueTitle, GrayTitle } from "@/components/reusables";
import { PRICING_PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type PricingPlan = (typeof PRICING_PLANS)[number];

const PLAN_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
};

const checkoutAppearance = {
  appearance: {
    elements: {
      drawerRoot: {
        zIndex: 2000,
      },
    },
  },
} as const;

function getActivePlanKey(
  isSignedIn: boolean,
  has?: (params: { plan: string }) => boolean,
) {
  if (!isSignedIn) return null;
  if (has?.({ plan: "pro" })) return "pro";
  if (has?.({ plan: "starter" })) return "starter";
  return "free";
}

interface PricingCardProps {
  plan: PricingPlan;
  compact?: boolean;
  ctaLabel?: string;
}

export function PricingCard({
  plan,
  compact = false,
  ctaLabel = "Get started",
}: PricingCardProps) {
  const { isSignedIn, isLoaded, has } = useAuth();
  const signedIn = isLoaded && isSignedIn === true;
  const activePlanKey = getActivePlanKey(signedIn, has);
  const isActive = signedIn && activePlanKey === plan.key;
  const isDowngrade =
    signedIn &&
    activePlanKey !== null &&
    !isActive &&
    PLAN_ORDER[plan.key] < PLAN_ORDER[activePlanKey];
  const paidCtaLabel = isDowngrade ? "Downgrade" : ctaLabel;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border transition-colors",
        compact ? "p-5" : "p-7",
        plan.featured
          ? compact
            ? "border-blue-500/50 bg-blue-500/4"
            : "border-blue-500/25 bg-blue-500/4"
          : compact
            ? "border-white/12 bg-[#0a0a0a]"
            : "border-white/8 bg-[#0f0f0f]",
      )}
    >
      {plan.featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full border border-blue-500/20 bg-[#0a0a0a] px-3 py-1 text-[11px] font-medium text-blue-400">
            Most popular
          </span>
        </div>
      )}

      <div className="mb-1 flex items-center gap-2">
        <p className="text-sm font-semibold text-white/90">{plan.label}</p>
        {isActive && (
          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
            Active
          </span>
        )}
      </div>

      <p className="mb-6 text-xs leading-relaxed text-white/35">
        {plan.description}
      </p>

      <div className="mb-1 flex items-baseline gap-1">
        <span className="font-serif text-4xl">
          {plan.price === 0 ? (
            <GrayTitle>$0</GrayTitle>
          ) : (
            <BlueTitle>${plan.price}</BlueTitle>
          )}
        </span>
        {plan.price > 0 && (
          <span className="text-sm text-white/30">/mo</span>
        )}
      </div>
      <p className="mb-6 text-xs text-white/25">
        {plan.price === 0 ? "Always free" : "Only billed monthly"}
      </p>

      <div className="mb-8 space-y-3 border-t border-white/6 pt-6">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                plan.featured ? "bg-blue-500/15" : "bg-white/8",
              )}
            >
              <Check
                className={cn(
                  "h-2.5 w-2.5",
                  plan.featured ? "text-blue-400" : "text-white/50",
                )}
              />
            </div>
            <span className="text-xs text-white/55">{feature}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        {isActive ? (
          <Button
            disabled
            className="w-full rounded-full text-sm font-semibold opacity-50 cursor-not-allowed border border-white/10 bg-transparent text-white/60"
            variant="ghost"
          >
            ✓ Current plan
          </Button>
        ) : plan.price === 0 ? (
          signedIn ? (
            <Button
              disabled
              className="w-full rounded-full text-sm font-semibold opacity-50 cursor-not-allowed border border-white/10 bg-transparent text-white/60"
              variant="ghost"
            >
              Default plan
            </Button>
          ) : (
            <Button
              asChild
              className="w-full rounded-full text-sm font-semibold border border-white/10 bg-transparent text-white/60 hover:bg-white/6 hover:text-white/90"
              variant="ghost"
            >
              <Link href="/sign-in">
                Get started free
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )
        ) : signedIn && plan.planId ? (
          <Show when="signed-in">
            <CheckoutButton
              planId={plan.planId}
              planPeriod="month"
              for="user"
              checkoutProps={checkoutAppearance}
            >
              <Button
                className={cn(
                  "w-full rounded-full text-sm font-semibold transition-all",
                  plan.featured
                    ? "bg-blue-500 text-white hover:bg-blue-400 active:scale-95"
                    : "border border-white/10 bg-transparent text-white/60 hover:bg-white/6 hover:text-white/90",
                )}
                variant="ghost"
              >
                {paidCtaLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CheckoutButton>
          </Show>
        ) : !isLoaded ? (
          <Button
            disabled
            className="w-full rounded-full text-sm font-semibold opacity-50 border border-white/10 bg-transparent text-white/60"
            variant="ghost"
          >
            {ctaLabel}
          </Button>
        ) : (
          <Button
            asChild
            className={cn(
              "w-full rounded-full text-sm font-semibold transition-all",
              plan.featured
                ? "bg-blue-500 text-white hover:bg-blue-400 active:scale-95"
                : "border border-white/10 bg-transparent text-white/60 hover:bg-white/6 hover:text-white/90",
            )}
            variant="ghost"
          >
            <Link href="/sign-in">
              {ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
