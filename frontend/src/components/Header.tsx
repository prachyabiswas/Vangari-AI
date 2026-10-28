"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { buttonVariants } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Leaf, LogOut, LayoutDashboard, Route } from "lucide-react";

export function Header() {
    const { user, logout } = useAuth();

    return (
        <header className="sticky top-0 z-50 w-full glass shadow-sm">
            <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-teal-400 hover:opacity-80 transition-opacity">
                    <Leaf className="w-6 h-6 text-primary" />
                    <span className="tracking-tight">Vangari</span>
                </Link>
                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            {user.role === 'ADMIN' && (
                                <Link
                                    href="/admin"
                                    className={cn(
                                        buttonVariants({ variant: "ghost", size: "sm" }),
                                        "hidden sm:flex text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                                    )}
                                >
                                    <LayoutDashboard className="w-4 h-4 mr-2" />
                                    Admin Dashboard
                                </Link>
                            )}
                            {user.role === 'COLLECTOR' && (
                                <Link
                                    href="/collector"
                                    className={cn(
                                        buttonVariants({ variant: "ghost", size: "sm" }),
                                        "hidden sm:flex text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950"
                                    )}
                                >
                                    <Route className="w-4 h-4 mr-2" />
                                    Route Board
                                </Link>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger className="focus:outline-none">
                                    <div className="relative h-10 w-10 rounded-full glow-primary-sm hover:ring-2 ring-primary transition-all cursor-pointer">
                                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                {user.email.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none">{user.role}</p>
                                                <p className="text-xs leading-none text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </DropdownMenuLabel>
                                        {user.role === 'ADMIN' && (
                                            <DropdownMenuItem className="sm:hidden">
                                                <Link href="/admin" className="flex items-center w-full cursor-pointer">
                                                    <LayoutDashboard className="w-4 h-4 mr-2" />
                                                    Admin Dashboard
                                                </Link>
                                            </DropdownMenuItem>
                                        )}
                                        {user.role === 'COLLECTOR' && (
                                            <DropdownMenuItem className="sm:hidden">
                                                <Link href="/collector" className="flex items-center w-full cursor-pointer">
                                                    <Route className="w-4 h-4 mr-2" />
                                                    Route Board
                                                </Link>
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/auth/login"
                                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "font-medium")}
                            >
                                Login
                            </Link>
                            <Link
                                href="/auth/register"
                                className={cn(
                                    buttonVariants({ size: "sm" }),
                                    "bg-primary text-primary-foreground hover:bg-primary/90 glow-primary font-medium rounded-full px-6 transition-all hover:scale-105"
                                )}
                            >
                                Join as Owner
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
