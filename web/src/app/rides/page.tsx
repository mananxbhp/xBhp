"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";

type Ride = {
  id: string;
  title: string;
  start: string;
  end: string;
  transport: string;
  budget: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
};

export default function RidesPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null));
  }, []);

  useEffect(() => {
    if (!uid) return;

    const q = query(
  collection(db, "rides"),
  where("uid", "==", uid),
  orderBy("createdAt", "desc")
);

    const unsub = onSnapshot(q, (snap) => {
      setRides(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    });

    return () => unsub();
  }, [uid]);

  if (!uid) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>My Rides</h1>
        <p>
          Please <a href="/login">login</a>.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1>My Ride Plans</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <a href="/feed">Feed</a>
        <a href="/rides/new">+ Create Ride Plan</a>
      </div>

      {rides.length === 0 ? (
        <p>
          No rides yet. <a href="/rides/new">Create your first ride plan</a>.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rides.map((x) => (
            <a
              key={x.id}
              href={`/rides/${x.id}`}
              style={{
                border: "1px solid #ddd",
                padding: 14,
                borderRadius: 10,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <strong>{x.title}</strong>
              <div>
                {x.start} → {x.end}
              </div>
              <div style={{ opacity: 0.8, fontSize: 13 }}>
                {(x.transport || "").toUpperCase()} • {(x.budget || "").toUpperCase()} • {(x.status || "").toUpperCase()}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
