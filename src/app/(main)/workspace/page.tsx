import WorkSpaceClient from "@/components/WorkSpaceClient";
import { getWorkspaceById, getWorkspaceUser } from "../../../../actions/workspace";

interface SearchParams {
  searchParams: Promise<{ prompt?: string; id?: string }>;
}

const WorkspacePage = async ({ searchParams }: SearchParams) => {
  const { prompt, id } = await searchParams;

  const user = await getWorkspaceUser();

  let workspace = null;
  if (id) {
    workspace = await getWorkspaceById(id, user.id);
  }

  return (
    <WorkSpaceClient
      initialPrompt={prompt ?? null}
      workspace={workspace}
      userCredits={user.credits}
      userId={user.id}
      userPlan={user.plan}
      userImageUrl={user.imageUrl || null}
    />
  );
};

export default WorkspacePage;
