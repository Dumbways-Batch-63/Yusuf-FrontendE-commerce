"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import Image from "next/image";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  products: {
    name: string;
    image_url: string[];
  };
}

interface Order {
  id: string;
  created_at: string;
  status: "pending" | "paid" | "shipped" | "cancelled" | "completed";
  total_amount: number;
  order_items: OrderItem[];
  tracking_number?: string;
  snap_token?: string;
}

export default function ProfilePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch("https://backend-ecommerc.vercel.app/api/products/orders/my-orders", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) throw new Error("Gagal mengambil data");

        const data: Order[] = await res.json();
        setOrders(data);
      } catch (err) {
        console.error(err);
        toast.error("Gagal memuat riwayat pesanan");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [supabase]);

  const confirmReceived = async (orderId: string) => {
    setUpdatingId(orderId);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Cek session sebelum menembak API
      if (!session) {
        toast.error("Sesi Anda berakhir, silakan login kembali");
        return;
      }

      const res = await fetch(`https://backend-ecommerc.vercel.app/api/products/order-status/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`, // Hilangkan '?' karena sudah dicek di atas
        },
        body: JSON.stringify({ status: "completed" }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Gagal mengonfirmasi pesanan");
      }

      // 🔥 Update state TANPA reload
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "completed" } : o)));

      toast.success("Pesanan dikonfirmasi 🎉", {
        description: "Terima kasih sudah berbelanja",
      });
    } catch (err: unknown) {
      // Penanganan error yang type-safe
      const errorMessage = err instanceof Error ? err.message : "Gagal memperbarui status";
      console.error(err);
      toast.error(errorMessage);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Riwayat Pesanan</h1>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-gray-50 border">
          <p className="text-gray-500 italic">Belum ada riwayat pesanan</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border bg-white p-6 shadow-sm">
              {/* HEADER */}
              <div className="flex justify-between flex-wrap gap-3 border-b pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Invoice</p>
                  <p className="text-sm font-black text-blue-600">INV/{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString("id-ID")}</p>
                </div>

                <span className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase border bg-gray-50">
                  {order.status === "pending" && "⏳ Menunggu Pembayaran"}
                  {order.status === "paid" && "📦 Diproses"}
                  {order.status === "shipped" && "🚚 Dikirim Dengan No resi :"}
                  {order.status === "completed" && "✅ Selesai"}
                  <p className="text-[10px] uppercase font-bold pt-2">{order.tracking_number}</p>
                </span>
              </div>

              {/* ITEMS */}
              <div className="space-y-4 mt-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border">
                      <Image src={item.products.image_url[0] || "/placeholder.png"} fill className="object-cover" alt={item.products.name} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{item.products.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × Rp {item.price_at_purchase.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* FOOTER */}
              <div className="mt-6 border-t pt-4 flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Total</p>
                  <p className="text-xl font-black">Rp {order.total_amount.toLocaleString()}</p>
                </div>

                <div className="flex gap-2">
                  {/* TOMBOL BAYAR SEKARANG (Hanya muncul jika pending) */}
                  {order.status === "pending" && (
                    <button
                      onClick={() => {
                        // snap_token sudah ada di interface Order, jadi tidak perlu 'as any'
                        if (order.snap_token) {
                          window.snap.pay(order.snap_token, {
                            onSuccess: () => {
                              toast.success("Pembayaran Berhasil!");
                              setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "paid" } : o)));
                            },
                            onPending: () => toast.info("Menunggu pembayaran..."),
                            onError: () => toast.error("Pembayaran gagal, silakan coba lagi."),
                            onClose: () => toast.warning("Selesaikan pembayaran Anda segera."),
                          });
                        } else {
                          toast.error("Token pembayaran tidak ditemukan.");
                        }
                      }}
                      className="bg-amber-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 shadow-sm"
                    >
                      Bayar Sekarang
                    </button>
                  )}

                  {/* TOMBOL KONFIRMASI TERIMA (Hanya muncul jika shipped) */}
                  {order.status === "shipped" && (
                    <button
                      disabled={updatingId === order.id}
                      onClick={() =>
                        toast("Konfirmasi penerimaan pesanan?", {
                          action: {
                            label: "Ya, sudah",
                            onClick: () => confirmReceived(order.id),
                          },
                        })
                      }
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
                    >
                      {updatingId === order.id ? "Memproses..." : "Pesanan Diterima"}
                    </button>
                  )}

                  {order.status === "completed" && <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">✔ Selesai</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
