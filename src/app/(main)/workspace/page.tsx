import WorkSpaceClient from "@/components/WorkSpaceClient";
import { auth } from "@clerk/nextjs/server";
import { checkUser } from "@/lib/checkUser";
import { redirect } from "next/navigation";

interface SearchParams {
  searchParams: Promise<{ prompt?: string; id?: string }>;
}

const WorkspacePage = async ({ searchParams }: SearchParams) => {
  const { userId } = await auth();
  if (!userId) {
    return redirect("/");
  }

  const { prompt } = await searchParams;
  const user = await checkUser();

  return (
    <WorkSpaceClient
      initialPrompt={prompt ?? null}
      userCredits={user?.credits ?? 0}
      userId={userId}
      userPlan={user?.plan ?? "free"}
      userImageUrl={user?.imageUrl}
    />
  );
};

export default WorkspacePage;
