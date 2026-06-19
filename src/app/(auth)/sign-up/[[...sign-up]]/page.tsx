import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

interface SignUpPageProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

export default async function Page({ searchParams }: SignUpPageProps) {
  const { userId } = await auth();
  const { redirect_url: redirectUrl } = await searchParams;
  const afterSignUp = redirectUrl ?? "/workspace";

  if (userId) {
    redirect(afterSignUp);
  }

  return (
    <SignUp
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      fallbackRedirectUrl={afterSignUp}
      forceRedirectUrl={redirectUrl}
    />
  );
}
