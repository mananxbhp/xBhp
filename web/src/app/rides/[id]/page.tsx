"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { useParams, useRouter } from "next/navigation";

type Ride = {
  uid: string;
  title: string;
  start: string;
  end: string;
  stops?: string[];
  transport?: string;
  budget?: string;
  startDateTime?: string;
  endDateTime?: string;
  status?: string;
};

export default function RideDetailPage() {
  const params = useParams();
  const id = String((params as any)?.id || "");
  const r = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null)), []);

  useEffect(() => {
    if (!uid || !id) return;

    const ref = doc(db, "rides", id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setLoading(false);
        if (!snap.exists()) return setErr("Ride not found.");
        const data = snap.data() as Ride;

        // Client-side check (rules should also protect server-side)
        if (data.uid !== uid) return setErr("Not allowed.");
        setRide(data);
      },
      (e) => {
        setLoading(false);
        setErr(e?.message ?? "Failed to load ride");
      }
    );

    return () => unsub();
  }, [uid, id]);

  async function removeRide() {
    const ok = confirm("Delete this ride plan?");
    if (!ok) return;

    await deleteDoc(doc(db, "rides", id));
    r.push("/rides");
  }

  if (!uid) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Ride Plan</h1>
        <p>Please <a href="/login">login</a>.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <p>Loading…</p>
      </main>
    );
  }

  if (err || !ride) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Ride Plan</h1>
        <p style={{ color: "crimson" }}>{err ?? "Unknown error"}</p>
        <p><a href="/rides">← Back</a></p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <a href="/rides">← Back</a>
        <a href="/feed">Feed</a>
      </div>

      <h1 style={{ marginBottom: 6 }}>{ride.title}</h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        {(ride.transport || "").toUpperCase()} • {(ride.budget || "").toUpperCase()} • {(ride.status || "").toUpperCase()}
      </div>

      <div style={{ display: "grid", gap: 8, border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
        <div><strong>Route:</strong> {ride.start} → {ride.end}</div>

        {Array.isArray(ride.stops) && ride.stops.length > 0 && (
          <div><strong>Stops:</strong> {ride.stops.join(" → ")}</div>
        )}

        {(ride.startDateTime || ride.endDateTime) && (
          <div>
            <strong>Time:</strong>{" "}
            {ride.startDateTime ? new Date(ride.startDateTime).toLocaleString() : "—"}{" "}
            to{" "}
            {ride.endDateTime ? new Date(ride.endDateTime).toLocaleString() : "—"}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button onClick={removeRide} style={{ padding: "10px 12px" }}>
          Delete
        </button>
      </div>
    </main>
  );
}
