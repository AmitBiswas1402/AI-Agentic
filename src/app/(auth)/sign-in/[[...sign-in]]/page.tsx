import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

interface SignInPageProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

export default async function Page({ searchParams }: SignInPageProps) {
  const { userId } = await auth();
  const { redirect_url: redirectUrl } = await searchParams;
  const afterSignIn = redirectUrl ?? "/workspace";

  if (userId) {
    redirect(afterSignIn);
  }

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      fallbackRedirectUrl={afterSignIn}
      forceRedirectUrl={redirectUrl}
    />
  );
}
