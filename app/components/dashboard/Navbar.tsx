"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, User as UserIcon, Store, LogOut, Menu, X } from "lucide-react";
import { createClient } from "@/app/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import Image from "next/image";

interface CartItem {
  id: string;
  quantity: number;
}

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const updateCartCount = useCallback(() => {
    if (typeof window !== "undefined") {
      const cart: CartItem[] = JSON.parse(localStorage.getItem("cart") || "[]");
      const total = cart.reduce((acc: number, item: CartItem) => acc + (item.quantity || 0), 0);
      setCartCount(total);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);

      if (session) {
        try {
          const res = await fetch("https://backend-ecommerc.vercel.app/api/auth/me", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          const data = await res.json();
          setIsAdmin(data?.profile?.role === "admin");
        } catch (err) {
          console.error("Role check failed:", err);
        }
      }

      requestAnimationFrame(() => {
        setIsMounted(true);
        updateCartCount();
      });
    };

    init();

    window.addEventListener("cartUpdate", updateCartCount);
    window.addEventListener("storage", updateCartCount);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setIsAdmin(false);
    });

    return () => {
      window.removeEventListener("cartUpdate", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
      subscription.unsubscribe();
    };
  }, [updateCartCount, supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cartUpdate"));
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/60 border-b border-white/30 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            {/* LOGO */}
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Logo" width={42} height={42} priority className="rounded-md" />
              <span className="text-lg font-semibold tracking-wide text-slate-900">
                56 <span className="text-amber-500 font-bold">Thrift Shop</span>
              </span>
            </Link>

            {/* DESKTOP MENU */}
            <div className="hidden md:flex items-center gap-5">
              <Link href="/" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition">
                Katalog
              </Link>

              {isAdmin && (
                <Link href="/admin" className="flex items-center gap-2 rounded-full px-4 py-2 bg-slate-900 text-white text-sm font-semibold shadow-md shadow-slate-900/20 hover:shadow-lg transition">
                  <Store className="w-4 h-4 text-amber-400" />
                  Admin Panel
                </Link>
              )}

              <Link href="/cart" className="relative rounded-full p-2 hover:bg-white/60 transition">
                <ShoppingCart className="w-5 h-5 text-slate-700" />
                {cartCount > 0 && (
                  <span key={cartCount} suppressHydrationWarning className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shadow-md">
                    {typeof window !== "undefined" ? cartCount : ""}
                  </span>
                )}
              </Link>

              <div className="h-6 w-px bg-slate-300/50" />

              {user ? (
                <div className="flex items-center gap-3">
                  <Link href="/profile" className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 shadow-sm hover:shadow-md transition">
                    <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-800">{user.email?.split("@")[0]}</span>
                  </Link>

                  <button onClick={handleLogout} className="rounded-full p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 transition">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link href="/login" className="rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition">
                  Login
                </Link>
              )}
            </div>

            {/* MOBILE BUTTON */}
            <button onClick={() => setMobileOpen(true)} className="md:hidden rounded-full p-2 hover:bg-white/60 transition">
              <Menu className="w-6 h-6 text-slate-800" />
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
          <div className="absolute right-0 top-0 h-full w-[80%] max-w-sm bg-white shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-semibold">Menu</span>
              <button onClick={() => setMobileOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <Link href="/" onClick={() => setMobileOpen(false)}>
                Katalog
              </Link>

              <Link href="/cart" onClick={() => setMobileOpen(false)}>
                Cart ({cartCount})
              </Link>

              {isAdmin && (
                <Link href="/admin" onClick={() => setMobileOpen(false)} className="font-semibold text-slate-900">
                  Admin Panel
                </Link>
              )}

              {user ? (
                <>
                  <Link href="/profile" onClick={() => setMobileOpen(false)}>
                    Profile
                  </Link>
                  <button onClick={handleLogout} className="text-left text-red-600">
                    Logout
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
