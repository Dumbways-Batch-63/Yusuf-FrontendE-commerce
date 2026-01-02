"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/app/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  stock: number;
  image_url: string[];
}

interface CartItem extends Product {
  quantity: number;
}

export default function ProductDetail() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [product, setProduct] = useState<Product | null>(null);
  const [activeImg, setActiveImg] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`https://backend-ecommerc.vercel.app/api/products/${id}`);
        const data = await res.json();
        setProduct(data);
        setActiveImg(data.image_url?.[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    loadData();
  }, [id, supabase]);

  const addToCart = async () => {
    if (!product) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast.error("Kamu belum login", {
        description: "Login dulu untuk menambahkan produk",
      });
      router.push("/login");
      return;
    }

    const cart: CartItem[] = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdate"));
    toast.success("Produk ditambahkan ke keranjang", {
      description: "Cek keranjang untuk melanjutkan checkout",
    });
  };

  if (loading) return <ProductSkeleton />;

  if (!product) return <div className="py-20 text-center text-slate-500">Produk tidak ditemukan</div>;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* GALLERY */}
          <div>
            <div className="relative aspect-square rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <Image key={activeImg} src={activeImg} alt={product.name} fill className="object-contain" />
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {product.image_url.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(url)}
                  className={`
                    relative h-20 w-20 rounded-xl overflow-hidden border
                    flex-shrink-0
                    transition
                    ${activeImg === url ? "border-amber-500 ring-2 ring-amber-400/30" : "border-slate-200 hover:border-slate-400"}
                  `}
                >
                  <Image src={url} alt="thumbnail" fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* PRODUCT INFO */}
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">{product.name}</h1>

            <p className="mt-4 text-2xl font-extrabold text-slate-900">Rp {product.price.toLocaleString("id-ID")}</p>

            <p className="mt-6 text-slate-600 leading-relaxed">{product.description || "Deskripsi produk belum tersedia."}</p>

            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={addToCart}
                disabled={!user}
                className={`
                  w-full rounded-xl py-4 text-sm font-semibold
                  transition-all active:scale-95
                  ${user ? "bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-900 shadow-lg shadow-slate-900/20" : "bg-slate-200 text-slate-500 cursor-not-allowed"}
                `}
              >
                {user ? "Tambah ke Keranjang" : "Login untuk Membeli"}
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-400">Stok tersedia: {product.stock}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

/* =========================
   SKELETON
========================= */

function ProductSkeleton() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <div className="aspect-square rounded-2xl bg-slate-200" />
            <div className="mt-4 flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 w-20 rounded-xl bg-slate-200" />
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <div className="h-8 w-3/4 bg-slate-200 rounded" />
            <div className="h-6 w-1/2 bg-slate-300 rounded" />
            <div className="h-4 w-full bg-slate-200 rounded" />
            <div className="h-4 w-5/6 bg-slate-200 rounded" />
            <div className="h-12 w-full bg-slate-900/10 rounded-xl mt-4" />
          </div>
        </div>
      </div>
    </main>
  );
}
