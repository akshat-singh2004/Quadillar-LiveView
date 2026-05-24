"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    }else {

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("profiles").insert([
      {
        id: user.id,
        email: user.email,
      },
    ]);
  }

  window.location.href = "/dashboard";
}
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="bg-zinc-900 p-8 rounded-2xl w-[350px] flex flex-col gap-4">
        <h1 className="text-3xl font-bold">
          Quadillar LiveView
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="p-3 rounded bg-zinc-800"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="p-3 rounded bg-zinc-800"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSignup}
          className="bg-white text-black p-3 rounded font-semibold"
        >
          Sign Up
        </button>

        <button
          onClick={handleLogin}
          className="bg-zinc-700 p-3 rounded"
        >
          Login
        </button>
      </div>
    </main>
  );
}