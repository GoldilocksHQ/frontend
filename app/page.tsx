import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-3xl space-y-8 p-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
            Goldilocks AI
          </h1>
          <p className="text-xl text-muted-foreground">
            Powering the global agentic economy
          </p>
        </div>

        <CardContent className="space-y-4">
          <div className="rounded-lg bg-secondary p-4">
            <p className="text-sm font-medium">
              Dashboard coming soon
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <Button asChild variant="default">
              <Link href="/signin">Sign In</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
