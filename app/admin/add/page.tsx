"use client";

import { useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, XCircle, X } from "lucide-react";
import Image from "next/image";

type AlertType = "success" | "error" | null;

export default function AddProduct() {
  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "",
    description: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]); // State untuk preview
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string }>({
    type: null,
    message: "",
  });

  const supabase = createClient();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);

    // Validasi total foto (yang sudah ada + yang baru dipilih)
    if (images.length + selectedFiles.length > 5) {
      setAlert({
        type: "error",
        message: "Maksimal upload 5 foto produk.",
      });
      return;
    }

    // Update Files
    const newImages = [...images, ...selectedFiles];
    setImages(newImages);

    // Update Previews (Blob URL)
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      setAlert({ type: "error", message: "Pilih minimal 1 foto produk." });
      return;
    }

    setLoading(true);
    setAlert({ type: null, message: "" });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setAlert({ type: "error", message: "Session habis, silakan login ulang." });
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("price", form.price);
    formData.append("stock", form.stock);
    formData.append("description", form.description);

    // Pastikan field-nya sesuai dengan yang diharapkan backend (biasanya "images")
    images.forEach((img) => formData.append("images", img));

    try {
      const res = await fetch("https://backend-ecommerc.vercel.app/api/products", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menambahkan produk");
      }

      setAlert({ type: "success", message: "Produk berhasil ditambahkan 🎉" });
      setTimeout(() => router.push("/admin"), 1200);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui";
      setAlert({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white border rounded-2xl shadow-sm p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Tambah Produk</h1>
        </div>

        {alert.type && (
          <div className={`mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${alert.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
            {alert.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {alert.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Input Nama, Harga, Stok (Tetap sama seperti kodemu) */}
          <input type="text" placeholder="Nama Produk" className="w-full rounded-xl border px-4 py-3 text-sm" onChange={(e) => setForm({ ...form, name: e.target.value })} required />

          <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Harga" className="rounded-xl border px-4 py-3 text-sm" onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <input type="number" placeholder="Stok" className="rounded-xl border px-4 py-3 text-sm" onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
          </div>

          <textarea placeholder="Deskripsi" className="w-full rounded-xl border px-4 py-3 text-sm h-32 resize-none" onChange={(e) => setForm({ ...form, description: e.target.value })} />

          {/* PREVIEW IMAGES */}
          {previews.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-4">
              {previews.map((src, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <Image src={src} fill className="object-cover" alt="preview" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow-lg">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* UPLOAD BOX */}
          {images.length < 5 && (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer hover:bg-slate-50 transition">
              <Upload className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Tambah Foto ({images.length}/5)</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          )}

          <button disabled={loading} className={`w-full rounded-xl py-4 text-sm font-semibold transition-all ${loading ? "bg-slate-300" : "bg-slate-900 text-white hover:bg-amber-500"}`}>
            {loading ? "Sedang Memproses..." : "Simpan Produk"}
          </button>
        </form>
      </div>
    </div>
  );
}
