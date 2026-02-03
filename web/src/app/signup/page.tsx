"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });

      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: name.trim(),
        email: cred.user.email,
        role: "user",
        createdAt: serverTimestamp(),
      });

      router.push("/feed");
    } catch (e: any) {
      setErr(e?.message || "Signup failed");
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1>Sign up</h1>
      <form onSubmit={onSignup} style={{ display: "grid", gap: 10 }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
        <button type="submit">Create account</button>
      </form>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <p style={{ marginTop: 14 }}>
        Already have an account? <a href="/login">Login</a>
      </p>
    </main>
  );
}
