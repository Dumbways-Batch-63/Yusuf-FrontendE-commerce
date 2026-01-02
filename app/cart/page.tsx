"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";
import { Trash2, Plus, Minus, ShoppingBag, Truck } from "lucide-react";
import { toast } from "sonner";

// --- INTERFACES ---
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string[];
  weight?: number;
}

interface LocationData {
  id: number;
  name: string;
}

interface MidtransResult {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  pdf_url?: string;
  finish_redirect_url?: string;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [courier, setCourier] = useState("jne");
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [addressDetail, setAddressDetail] = useState("");

  // Data dari API (Cascading)
  const [provinces, setProvinces] = useState<LocationData[]>([]);
  const [cities, setCities] = useState<LocationData[]>([]);
  const [districts, setDistricts] = useState<LocationData[]>([]);

  // Pilihan User
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const router = useRouter();
  const supabase = createClient();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Fungsi pilih semua (opsional)
  const toggleSelectAll = () => {
    if (selectedIds.length === cartItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map((item) => item.id));
    }
  };

  // --- LOGIC: FETCH DATA LOKASI ---

  // 1. Load Provinsi saat pertama kali buka
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const res = await fetch("https://backend-ecommerc.vercel.app/api/products/shipping/provinces");
        const data = await res.json();
        setProvinces(data || []);
      } catch (err) {
        console.error("Gagal ambil provinsi", err);
      }
    };
    fetchProvinces();
  }, []);

  // 2. Load Kota saat Provinsi dipilih
  useEffect(() => {
    if (!selectedProvince) {
      setCities([]);
      return;
    }
    const fetchCities = async () => {
      try {
        const res = await fetch(`https://backend-ecommerc.vercel.app/api/products/shipping/cities/${selectedProvince}`);
        const data = await res.json();
        setCities(data || []);
        setDistricts([]); // Reset dropdown bawahnya
        setSelectedCity("");
        setSelectedDistrict("");
      } catch (err) {
        console.error("Gagal ambil kota", err);
      }
    };
    fetchCities();
  }, [selectedProvince]);

  // 3. Load Kecamatan saat Kota dipilih
  useEffect(() => {
    if (!selectedCity) {
      setDistricts([]);
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await fetch(`https://backend-ecommerc.vercel.app/api/products/shipping/districts/${selectedCity}`);
        const data = await res.json();
        setDistricts(data || []);
        setSelectedDistrict("");
      } catch (err) {
        console.error("Gagal ambil kecamatan", err);
      }
    };
    fetchDistricts();
  }, [selectedCity]);

  // --- LOGIC: HITUNG ONGKIR ---
  const calculateShipping = useCallback(
    async (destId: string, courierName: string) => {
      if (!destId || !courierName || cartItems.length === 0) return;

      setIsCalculating(true);
      try {
        const res = await fetch(`https://backend-ecommerc.vercel.app/api/products/shipping/cost`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination_id: destId,
            courier: courierName,
            items: cartItems,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShippingCost(data.cost);
        } else {
          setShippingCost(0);
          toast.error("Kurir tidak tersedia untuk wilayah ini");
        }
      } catch (err) {
        console.error("Gagal hitung ongkir", err);
      } finally {
        setIsCalculating(false);
      }
    },
    [cartItems]
  );

  // Trigger hitung ongkir otomatis
  useEffect(() => {
    if (selectedDistrict && courier) {
      calculateShipping(selectedDistrict, courier);
    } else {
      setShippingCost(0);
    }
  }, [selectedDistrict, courier, calculateShipping]);

  // --- LOGIC: CART MANAGEMENT ---
  useEffect(() => {
    const items = JSON.parse(localStorage.getItem("cart") || "[]");
    setCartItems(items);
    setLoading(false);
  }, []);

  const syncCart = (updated: CartItem[]) => {
    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdate"));
  };

  const updateQuantity = (id: string, delta: number) => {
    const updated = cartItems.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
    syncCart(updated);
  };

  const removeItem = (id: string) => {
    syncCart(cartItems.filter((item) => item.id !== id));
  };

  // Hanya filter item yang ID-nya ada di selectedIds
  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.id));

  const totalPrice = selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalWeight = selectedItems.reduce((acc, item) => acc + (item.weight || 1000) * item.quantity, 0);

  // --- LOGIC: CHECKOUT ---
  const handleCheckout = async () => {
    // 1. Validasi awal
    if (!selectedDistrict || !addressDetail) {
      toast.error("Mohon lengkapi alamat dan kecamatan!");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Pilih minimal satu item untuk dibayar!");
      return;
    }

    setIsProcessing(true);

    try {
      // 2. Ambil Session Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Silakan login terlebih dahulu");
        router.push("/login");
        return;
      }

      // 3. Cari Nama Lokasi (Gunakan '|| ""' untuk menghindari undefined)
      const selectedProvinceName = provinces.find((p) => p.id.toString() === selectedProvince)?.name || "";
      const selectedCityName = cities.find((c) => c.id.toString() === selectedCity)?.name || "";
      const selectedDistrictName = districts.find((d) => d.id.toString() === selectedDistrict)?.name || "";

      // Susun Alamat Lengkap yang rapi
      const fullAddress = `${addressDetail}, Kec. ${selectedDistrictName}, ${selectedCityName}, Prov. ${selectedProvinceName}`;

      const itemsToSubmit = selectedItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));
      // 4. Kirim ke API Backend
      const res = await fetch("https://backend-ecommerc.vercel.app/api/products/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          items: itemsToSubmit,
          totalPrice: totalPrice + shippingCost,
          destination_id: selectedDistrict,
          courier: courier,
          shipping_address: fullAddress,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Gagal membuat pesanan");
      }

      // 5. Eksekusi Pembayaran Midtrans
      if (result.token) {
        window.snap.pay(result.token, {
          onSuccess: (res) => {
            // Tipe data otomatis terbaca dari .d.ts
            console.log("Success:", res);
            toast.success("Pembayaran Berhasil!");
            const remainingItems = cartItems.filter((item) => !selectedIds.includes(item.id));
            syncCart(remainingItems);
            setSelectedIds([]);
            window.dispatchEvent(new Event("cartUpdate"));
            router.push("/profile");
          },
          onPending: (res) => {
            console.log("Pending:", res);
            toast.info("Pesanan disimpan, segera selesaikan pembayaran.");
            localStorage.removeItem("cart");
            window.dispatchEvent(new Event("cartUpdate"));
            router.push("/profile");
          },
          onError: (err) => {
            const errorMsg = (err as MidtransError)?.status_message || "Pembayaran Gagal!";
            toast.error(errorMsg);
          },
          onClose: () => {
            toast.warning("Anda menutup pembayaran.");
            router.push("/profile");
          },
        });
      } else {
        // Jika backend tidak kirim token (misal hanya simpan order)
        const remainingItems = cartItems.filter((item) => !selectedIds.includes(item.id));
        syncCart(remainingItems);
        setSelectedIds([]);
        window.dispatchEvent(new Event("cartUpdate"));
        toast.success("Pesanan Berhasil!");
        router.push("/profile");
      }
    } catch (err: unknown) {
      // Penanganan Error tanpa 'any'
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Terjadi kesalahan yang tidak diketahui");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!loading && cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="bg-gray-100 p-6 rounded-full mb-4">
          <ShoppingBag className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold">Keranjang Kosong</h2>
        <Link href="/" className="mt-6 px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
          Mulai Belanja
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <h1 className="text-3xl font-black mb-8 flex items-center gap-3">
        <ShoppingBag className="text-blue-600" /> Keranjang
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <CartSkeleton />
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 bg-white rounded-2xl border items-center shadow-sm">
                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {/* CHECKBOX */}
                  <Image src={item.image_url[0]} fill className="object-cover" alt={item.name} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{item.name}</p>
                  <p className="text-sm  font-bold">Rp {item.price.toLocaleString("id-ID")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 border rounded-md hover:bg-gray-50">
                    <Minus size={14} />
                  </button>
                  <span className="font-bold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1 border rounded-md hover:bg-gray-50">
                    <Plus size={14} />
                  </button>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border p-6 shadow-sm sticky top-24">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Truck size={20} className="text-blue-600" /> Pengiriman
            </h3>

            <div className="space-y-3 mb-6">
              {/* Dropdown Provinsi */}
              <select className="w-full p-3 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)}>
                <option value="">Pilih Provinsi</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Dropdown Kota */}
              <select
                disabled={!selectedProvince}
                className="w-full p-3 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="">Pilih Kota/Kabupaten</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Dropdown Kecamatan */}
              <select
                disabled={!selectedCity}
                className="w-full p-3 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
              >
                <option value="">Pilih Kecamatan</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Pilihan Kurir */}
              <select className="w-full p-3 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={courier} onChange={(e) => setCourier(e.target.value)}>
                <option value="jne">JNE (Reguler)</option>
                <option value="sicepat">SiCepat</option>
                <option value="jnt">J&T Express</option>
                <option value="ninja">Ninja Xpress</option>
                <option value="lion">Lion Parcel</option>
              </select>

              {/* Detail Alamat */}
              <textarea
                rows={3}
                placeholder="Detail alamat: No. Rumah, RT/RW, Patokan..."
                className="w-full p-3 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 text-xs">TOTAL BERAT ({(totalWeight / 1000).toFixed(1)} KG)</span>
                <span className="text-gray-500 uppercase text-xs font-bold">{courier}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-600">Subtotal</span>
                <span>Rp {totalPrice.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-600">Ongkir</span>
                <span className={isCalculating ? "animate-pulse text-blue-500" : "text-gray-900"}>{isCalculating ? "Menghitung..." : `Rp ${shippingCost.toLocaleString("id-ID")}`}</span>
              </div>
              <div className="flex justify-between border-t pt-4">
                <span className="font-bold text-gray-800">Total Akhir</span>
                <span className="text-xl font-black ">Rp {(totalPrice + shippingCost).toLocaleString("id-ID")}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isProcessing || isCalculating || !selectedDistrict}
              className="w-full mt-6 bg-slate-900 text-white rounded-2xl py-4 font-bold hover:bg-amber-500 transition-all disabled:opacity-50 disabled:hover:bg-slate-900 shadow-lg shadow-gray-200"
            >
              {isProcessing ? "Menyiapkan Pesanan..." : "Bayar Sekarang"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CartSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2].map((i) => (
      <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border">
        <div className="w-20 h-20 bg-gray-200 rounded-xl" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
          <div className="h-3 w-1/3 bg-gray-100 rounded" />
        </div>
      </div>
    ))}
  </div>
);
