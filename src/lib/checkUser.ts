import { currentUser, auth } from "@clerk/nextjs/server";
import { Plan } from "../../types/plans";
import { db } from "./prisma";
import { PLANS } from "./constants";

const getCurrentPlan = async (): Promise<Plan> => {
  const { has } = await auth();
  if (has({ plan: "pro" })) return "pro";
  if (has({ plan: "starter" })) return "starter";

  return "free";
};

const syncPlan = async (
  userId: string,
  currentPlan: Plan,
  existingPlan: string,
  credits: number,
) => {
  if (existingPlan === currentPlan) {
    return db.user.findUniqueOrThrow({ where: { id: userId } });
  }

  return db.user.update({
    where: { id: userId },
    data: {
      plan: currentPlan,
      credits: credits + PLANS[currentPlan].credits,
    },
  });
};

export const checkUser = async () => {
  const user = await currentUser();
  if (!user) {
    return null;
  }

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) {
    return null;
  }

  const profile = {
    clerkId: user.id,
    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || email,
    email,
    imageUrl: user.imageUrl ?? "",
  };

  try {
    const currentPlan = await getCurrentPlan();

    const existingByClerkId = await db.user.findUnique({
      where: { clerkId: user.id },
    });

    if (existingByClerkId) {
      const refreshed = await db.user.update({
        where: { clerkId: user.id },
        data: { name: profile.name, imageUrl: profile.imageUrl },
      });

      return syncPlan(
        refreshed.id,
        currentPlan,
        refreshed.plan,
        refreshed.credits,
      );
    }

    const existingByEmail = await db.user.findUnique({
      where: { email },
    });

    if (existingByEmail) {
      const linked = await db.user.update({
        where: { email },
        data: profile,
      });

      return syncPlan(
        linked.id,
        currentPlan,
        linked.plan,
        linked.credits,
      );
    }

    return await db.user.create({
      data: {
        ...profile,
        credits: PLANS.free.credits,
        plan: "free",
      },
    });
  } catch (error) {
    console.error("Error checking user: ", error);
    return null;
  }
};
