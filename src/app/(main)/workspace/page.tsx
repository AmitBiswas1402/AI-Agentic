import WorkSpaceClient from "@/components/WorkSpaceClient";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

interface SearchParams {
    searchParams: Promise<{ prompt?: string; id?: string }>;
}

const WorkspacePage = async ({searchParams}: SearchParams) => {
    const {userId} = await auth();
    if (!userId) {
        return redirect("/");
    }

    const { prompt, id } = await searchParams;

  return (
    <WorkSpaceClient />
  )
}

export default WorkspacePage