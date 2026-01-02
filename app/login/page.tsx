import LoginButton from "@/app/components/LoginButton";
import { createClient } from "../utils/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();

    // Jika Admin nyasar ke sini, lempar ke dashboard admin
    if (profile?.role === "admin") {
      redirect("/admin");
    }
    // Jika User biasa nyasar ke sini, lempar ke home
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl border text-center max-w-md w-full items-center">
        <h1 className="text-3xl font-black mb-2 text-gray-900">Selamat Datang</h1>
        <p className="mb-8 text-gray-500">Silakan login untuk mulai belanja dan mengelola keranjang Anda</p>
        <div className="">
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
