"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { useRouter } from "next/navigation";

export default function NewRidePage() {
  const r = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [transport, setTransport] = useState<"bike" | "car">("bike");
  const [budget, setBudget] = useState<"budget" | "mid" | "luxury">("mid");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [stops, setStops] = useState<string[]>([""]);

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null)), []);

  function updateStop(i: number, value: string) {
    setStops((prev) => prev.map((x, idx) => (idx === i ? value : x)));
  }
  function addStop() {
    setStops((prev) => [...prev, ""]);
  }
  function removeStop(i: number) {
    setStops((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function createRide(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!uid) return setErr("Please login first.");
    if (!title.trim()) return setErr("Title is required.");
    if (!start.trim() || !end.trim()) return setErr("Start and End are required.");

    setLoading(true);
    try {
      const cleanStops = stops.map((s) => s.trim()).filter(Boolean);

      const docRef = await addDoc(collection(db, "rides"), {
        uid,
        title: title.trim(),
        start: start.trim(),
        end: end.trim(),
        stops: cleanStops,
        transport,
        budget,
        startDateTime: startDateTime || "",
        endDateTime: endDateTime || "",
        status: "planned",
        createdAt: serverTimestamp(),
      });

      r.push(`/rides/${docRef.id}`);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create ride");
    } finally {
      setLoading(false);
    }
  }

  if (!uid) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Create Ride Plan</h1>
        <p>
          Please <a href="/login">login</a>.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720, margin: "0 auto" }}>
      <h1>Create Ride Plan</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <a href="/rides">← Back</a>
        <a href="/feed">Feed</a>
      </div>

      <form onSubmit={createRide} style={{ display: "grid", gap: 12 }}>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Delhi → Spiti Circuit"
            style={{ width: "100%", padding: 10 }}
          />
        </label>

        <label>
          Start
          <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="Delhi" style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          End
          <input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="Kaza" style={{ width: "100%", padding: 10 }} />
        </label>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Stops (optional)</div>
          {stops.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <input
                value={s}
                onChange={(e) => updateStop(i, e.target.value)}
                placeholder={`Stop ${i + 1} (e.g., Chandigarh)`}
                style={{ flex: 1, padding: 10 }}
              />
              {stops.length > 1 && (
                <button type="button" onClick={() => removeStop(i)} style={{ padding: "10px 12px" }}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addStop} style={{ width: "fit-content", padding: "10px 12px" }}>
            + Add stop
          </button>
        </div>

        <label>
          Transport
          <select value={transport} onChange={(e) => setTransport(e.target.value as any)} style={{ width: "100%", padding: 10 }}>
            <option value="bike">Bike</option>
            <option value="car">Car</option>
          </select>
        </label>

        <label>
          Budget
          <select value={budget} onChange={(e) => setBudget(e.target.value as any)} style={{ width: "100%", padding: 10 }}>
            <option value="budget">Budget</option>
            <option value="mid">Mid</option>
            <option value="luxury">Luxury</option>
          </select>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Start date & time
            <input type="datetime-local" value={startDateTime} onChange={(e) => setStartDateTime(e.target.value)} style={{ width: "100%", padding: 10 }} />
          </label>
          <label>
            End date & time
            <input type="datetime-local" value={endDateTime} onChange={(e) => setEndDateTime(e.target.value)} style={{ width: "100%", padding: 10 }} />
          </label>
        </div>

        <button disabled={loading} type="submit" style={{ padding: 12 }}>
          {loading ? "Creating..." : "Create Ride Plan"}
        </button>

        {err && <p style={{ color: "crimson" }}>{err}</p>}
      </form>
    </main>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> 3294f60 (Fix merge conflict markers in rides/new page)
