"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      router.push("/feed");
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1>Login</h1>
      <form onSubmit={onLogin} style={{ display: "grid", gap: 10 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
        <button type="submit">Login</button>
      </form>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <p style={{ marginTop: 14 }}>
        New here? <a href="/signup">Create an account</a>
      </p>
    </main>
  );
}
