"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Login failed");

            login(data.user, data.token);
            router.push("/");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 w-full flex flex-col justify-center items-center py-12 px-6 relative overflow-hidden min-h-[calc(100vh-64px)]">
            {/* Background glowing effects */}
            <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-[100px] -z-10 animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                <Card className="glass-card border-primary/20 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-violet-500"></div>
                    <CardHeader className="text-center space-y-3 pb-6">
                        <div className="mx-auto bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full mb-2">
                            <LogIn className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-3xl font-bold font-heading">Welcome Back</CardTitle>
                        <CardDescription className="text-base">Login to your Vangari AI account</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    required 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="bg-background/50 h-11 transition-all focus:ring-primary focus:border-primary"
                                    placeholder="name@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link href="#" className="text-xs text-primary hover:underline font-medium">Forgot password?</Link>
                                </div>
                                <Input 
                                    id="password" 
                                    type="password" 
                                    required 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    className="bg-background/50 h-11 transition-all focus:ring-primary focus:border-primary"
                                    placeholder="••••••••"
                                />
                            </div>
                            {error && (
                                <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-in fade-in">
                                    {error}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 pb-8">
                            <Button type="submit" disabled={loading} className="w-full h-12 text-lg rounded-xl glow-primary transition-all">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Logging in...
                                    </>
                                ) : (
                                    "Login"
                                )}
                            </Button>
                            <p className="text-sm text-muted-foreground text-center">
                                Don't have an account? <Link href="/auth/register" className="text-primary font-semibold hover:underline">Sign up</Link>
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
