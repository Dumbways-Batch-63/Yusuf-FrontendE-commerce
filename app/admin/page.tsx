"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/app/utils/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image_url: string[];
}

interface Order {
  id: string;
  total_amount: number;
  status: "pending" | "paid" | "shipped" | "cancelled" | "completed";
  created_at: string;
  profiles: { full_name: string };
  tracking_number?: string;
}

type ActiveMenu = "orders" | "products";

const menus: ActiveMenu[] = ["orders", "products"];

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {/* header */}
      <div className="flex gap-4 px-4 py-4 bg-slate-50 border-b">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-4 w-24 bg-slate-200 rounded" />
        ))}
      </div>

      {/* rows */}
      <div className="divide-y">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-4 items-center">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-6 w-20 bg-slate-200 rounded-full" />
            <div className="h-8 w-28 bg-slate-200 rounded-lg ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>("orders");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const [prodRes, orderRes] = await Promise.all([
        fetch("https://backend-ecommerc.vercel.app/api/products"),
        fetch("https://backend-ecommerc.vercel.app/api/products/stats", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }),
      ]);

      setProducts(await prodRes.json());
      const orderData = await orderRes.json();
      setOrders(orderData.orders || []);
    } catch {
      toast.error("Gagal memuat data dashboard");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const checkAdminRole = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return (window.location.href = "/");

    const res = await fetch("https://backend-ecommerc.vercel.app/api/auth/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();

    if (data.profile.role !== "admin") {
      toast.error("Akses ditolak");
      window.location.href = "/";
    }
  }, [supabase]);

  useEffect(() => {
    checkAdminRole().then(fetchData);
  }, [checkAdminRole, fetchData]);

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus = "";
    let trackingNumber: string | null = null;

    // Jika status sudah 'paid' (dari Midtrans), Admin tugasnya input Resi
    if (currentStatus === "paid") {
      trackingNumber = prompt("Masukkan nomor resi pengiriman:");
      if (!trackingNumber) return; // Batal jika resi kosong
      nextStatus = "shipped";
    }
    // Jika kamu ingin admin bisa membatalkan pesanan pending yang expired
    else if (currentStatus === "pending") {
      const confirmCancel = confirm("Batalkan pesanan ini?");
      if (confirmCancel) nextStatus = "cancelled";
      else return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const res = await fetch(`https://backend-ecommerc.vercel.app/api/products/order-status/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: nextStatus, tracking_number: trackingNumber }),
      });

      if (!res.ok) throw new Error();

      toast.success("Pesanan diperbarui ke: " + nextStatus);
      fetchData(); // Refresh data
    } catch {
      toast.error("Gagal memperbarui status");
    }
  };

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Seller <span className="text-amber-500">Center</span>
          </h1>
          <p className="text-sm text-slate-500">Kelola toko secara profesional</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border shadow-sm">
          {menus.map((m) => (
            <button
              key={m}
              onClick={() => setActiveMenu(m)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition
        ${activeMenu === m ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-900"}`}
            >
              {m === "orders" ? "Pesanan" : "Produk"}
            </button>
          ))}
        </div>

        <Link href="/admin/add" className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-500 hover:text-slate-900 transition shadow">
          + Tambah Produk
        </Link>
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
        {loading ? (
          <TableSkeleton />
        ) : activeMenu === "orders" ? (
          <table className="min-w-[900px] w-full">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-bold">
              <tr>
                <th className="p-4">Invoice</th>
                <th className="p-4">Pembeli</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-bold text-amber-500">INV/{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-4">{o.profiles?.full_name}</td>
                  <td className="p-4 font-semibold">Rp {o.total_amount.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-md text-xs font-bold ${o.status === "paid" ? "bg-emerald-100 text-emerald-700" : o.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100"}`}>
                      {o.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    {/* LOGIKA TOMBOL AKSI */}
                    {o.status === "paid" && (
                      <button onClick={() => handleUpdateStatus(o.id, "paid")} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-slate-900 transition">
                        Input Resi & Kirim
                      </button>
                    )}

                    {o.status === "pending" && <span className="text-xs text-slate-400 italic">Menunggu pembayaran</span>}

                    {o.status === "shipped" && (
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-emerald-600">Dikirim</span>
                        <span className="text-[10px] font-mono text-slate-500">{o.tracking_number}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="min-w-[800px] w-full">
            <thead className="bg-slate-50 text-sm font-semibold">
              <tr>
                <th className="p-4">Produk</th>
                <th className="p-4">Harga</th>
                <th className="p-4">Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="p-4 flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border">
                      <Image src={p.image_url[0]} fill className="object-cover" alt={p.name} />
                    </div>
                    {p.name}
                  </td>
                  <td className="p-4">Rp {p.price.toLocaleString()}</td>
                  <td className="p-4">{p.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
