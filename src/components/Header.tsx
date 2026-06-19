import { Show, UserButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { CreditsBadge } from "./CreditsBadge";
import { checkUser } from "@/lib/checkUser";
import { Plan } from "../../types/plans";
import { PLANS } from "@/lib/constants";

const Header = async () => {
  const user = await checkUser();

  return (
    <header className="w-full fixed top-0 left-0 z-50 h-16 border-b border-white/6 bg-white/7 backdrop-blur-md">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="AI Creator" width={40} height={40} />
          <h1 className="text-2xl font-bold">AI Creator</h1>
        </Link>

        <div className="flex items-center gap-5">
          <Show when="signed-in">
            <Link
              href="/projects"
              className="text-md font-medium text-gray-300 hover:text-white transition-colors"
            >
              Projects
            </Link>

            <CreditsBadge
              credits={user?.credits ?? 0}
              limit={PLANS[(user?.plan as Plan) ?? "free"].credits}
            />
            <UserButton />
          </Show>

          <Show when="signed-out">
            <Button
              asChild
              size="sm"
              className="rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-6 cursor-pointer bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.03] transition-all duration-200"
            >
              <Link href="/sign-in">
                <span className="inline-flex items-center gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </Button>
          </Show>
        </div>
      </nav>
    </header>
  );
};

export default Header;
