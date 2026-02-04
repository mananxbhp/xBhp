"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { useRouter } from "next/navigation";

export default function FeedPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/login");
      else setEmail(u.email ?? "");
    });
  }, [router]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>xBhp Feed</h1>
      <p>Logged in as: {email}</p>
      <button onClick={() => signOut(auth)}>Logout</button>
    </main>
  );
}

<a href="/rides">My Ride Plans</a>