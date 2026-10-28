"use client";

import { UploadForm } from '@/components/UploadForm';
import { OwnerHistory } from '@/components/OwnerHistory';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="flex-1 flex flex-col items-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

      <section className="flex-1 w-full max-w-5xl py-20 px-6 flex flex-col items-center gap-12">
        <div className="text-center space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 text-sm font-medium text-primary mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Appraisal</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground via-foreground to-foreground/60 drop-shadow-sm font-heading">
            Transform Waste <br className="hidden md:block" />
            into <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400 glow-text">Wealth</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Upload a picture of your recyclable scrap. Our AI will instantly appraise its value, calculate fair market price, and dispatch a certified collector to your location.
          </p>
        </div>

        <div className="w-full animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
          {user ? (
            <div className="flex flex-col gap-10">
              <div className="w-full max-w-2xl mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-violet-500/50 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative glass-card rounded-2xl p-6 sm:p-10">
                  <UploadForm />
                </div>
              </div>
              {user.role === 'OWNER' && (
                <div className="w-full">
                  <OwnerHistory />
                </div>
              )}
            </div>
          ) : (
            <Card className="max-w-md mx-auto glass-card border-primary/20 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-400 to-violet-500"></div>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold font-heading">Get Started</CardTitle>
                <CardDescription className="text-base">
                  Join the green revolution. Login or register to start appraising scrap.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Link
                  href="/auth/register"
                  className={cn(
                    buttonVariants(),
                    "w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-lg rounded-xl glow-primary transition-all hover:scale-[1.02]"
                  )}
                >
                  Join as Owner <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  href="/auth/login"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full h-12 text-lg rounded-xl border-border/50 hover:bg-muted transition-all"
                  )}
                >
                  Login
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}
