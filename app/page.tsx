"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string[];
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://backend-ecommerc.vercel.app/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Katalog <span className="text-amber-500">Pilihan</span>
          </h1>
          <p className="mt-3 max-w-xl text-slate-500 text-sm md:text-base">Temukan koleksi terbaik dengan kualitas premium dan harga bersahabat.</p>
        </header>

        {/* GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {loading ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />) : products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </main>
  );
}

/* =========================
   PRODUCT CARD
========================= */

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`} className="group">
      <div
        className="
          relative overflow-hidden
          rounded-2xl bg-white
          border border-slate-100
          shadow-sm
          hover:shadow-xl
          hover:-translate-y-1
          transition-all duration-300
        "
      >
        {/* IMAGE */}
        <div className="relative h-48 md:h-56 w-full bg-slate-100 overflow-hidden">
          <Image src={product.image_url?.[0] || "/placeholder.png"} alt={product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
        </div>

        {/* CONTENT */}
        <div className="p-4 md:p-5">
          <h2 className="text-sm md:text-base font-semibold text-slate-800 truncate uppercase tracking-wide">{product.name}</h2>

          <p className="mt-1 text-lg font-extrabold text-slate-900">Rp {product.price.toLocaleString("id-ID")}</p>

          <div
            className="
              mt-4
              w-full rounded-xl
              bg-slate-900
              py-2.5
              text-center
              text-sm font-semibold text-white
              group-hover:bg-amber-500
              transition-colors
            "
          >
            Lihat Detail
          </div>
        </div>
      </div>
    </Link>
  );
}

/* =========================
   SKELETON CARD
========================= */

function SkeletonCard() {
  return (
    <div
      className="
        animate-pulse
        rounded-2xl
        bg-white
        border border-slate-100
        shadow-sm
        overflow-hidden
      "
    >
      <div className="h-48 md:h-56 bg-slate-200" />

      <div className="p-4 md:p-5 space-y-3">
        <div className="h-4 w-3/4 bg-slate-200 rounded" />
        <div className="h-5 w-1/2 bg-slate-300 rounded" />
        <div className="h-9 w-full bg-slate-900/10 rounded-xl mt-4" />
      </div>
    </div>
  );
}
