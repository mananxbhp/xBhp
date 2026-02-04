"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { useParams, useRouter } from "next/navigation";

type Ride = {
  uid: string;
  title: string;
  start: string;
  end: string;
  stops?: string[];
  transport?: "bike" | "car";
  budget?: "budget" | "mid" | "luxury";
  startDateTime?: string;
  endDateTime?: string;
  status?: "planned" | "ongoing" | "completed" | "cancelled";
};

function normalizeDtLocal(value?: string) {
  // stored as "YYYY-MM-DDTHH:mm" from <input type="datetime-local">
  return value || "";
}

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [stops, setStops] = useState<string[]>([""]);
  const [transport, setTransport] = useState<"bike" | "car">("bike");
  const [budget, setBudget] = useState<"budget" | "mid" | "luxury">("mid");
  const [status, setStatus] = useState<"planned" | "ongoing" | "completed" | "cancelled">("planned");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null)), []);

  useEffect(() => {
    if (!uid || !id) return;

    const ref = doc(db, "rides", String(id));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setLoading(false);
        if (!snap.exists()) return setErr("Ride not found.");
        const data = snap.data() as Ride;

        if (data.uid !== uid) return setErr("Not allowed.");
        setErr(null);
        setRide(data);

        // keep form in sync only when NOT editing
        if (!isEditing) {
          setTitle(data.title ?? "");
          setStart(data.start ?? "");
          setEnd(data.end ?? "");
          setStops((Array.isArray(data.stops) && data.stops.length ? data.stops : [""]).map((x) => x ?? ""));
          setTransport((data.transport as any) || "bike");
          setBudget((data.budget as any) || "mid");
          setStatus((data.status as any) || "planned");
          setStartDateTime(normalizeDtLocal(data.startDateTime));
          setEndDateTime(normalizeDtLocal(data.endDateTime));
        }
      },
      (e) => {
        setLoading(false);
        setErr(e?.message ?? "Failed to load ride");
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, id, isEditing]);

  const canRender = useMemo(() => uid && id, [uid, id]);

  function updateStop(i: number, value: string) {
    setStops((prev) => prev.map((x, idx) => (idx === i ? value : x)));
  }
  function addStop() {
    setStops((prev) => [...prev, ""]);
  }
  function removeStop(i: number) {
    setStops((prev) => prev.filter((_, idx) => idx !== i));
  }

  function startEditing() {
    if (!ride) return;
    setSaveMsg(null);
    setIsEditing(true);

    // ensure form is loaded from latest ride
    setTitle(ride.title ?? "");
    setStart(ride.start ?? "");
    setEnd(ride.end ?? "");
    setStops((Array.isArray(ride.stops) && ride.stops.length ? ride.stops : [""]).map((x) => x ?? ""));
    setTransport((ride.transport as any) || "bike");
    setBudget((ride.budget as any) || "mid");
    setStatus((ride.status as any) || "planned");
    setStartDateTime(normalizeDtLocal(ride.startDateTime));
    setEndDateTime(normalizeDtLocal(ride.endDateTime));
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveMsg(null);
  }

  async function saveEdits() {
    if (!uid || !id) return;
    setSaveMsg(null);
    setErr(null);

    if (!title.trim()) return setErr("Title is required.");
    if (!start.trim() || !end.trim()) return setErr("Start and End are required.");

    setSaving(true);
    try {
      const cleanStops = stops.map((s) => s.trim()).filter(Boolean);

      await updateDoc(doc(db, "rides", String(id)), {
        title: title.trim(),
        start: start.trim(),
        end: end.trim(),
        stops: cleanStops,
        transport,
        budget,
        status,
        startDateTime: startDateTime || "",
        endDateTime: endDateTime || "",
      });

      setIsEditing(false);
      setSaveMsg("Saved ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function removeRide() {
    if (!id) return;
    const ok = confirm("Delete this ride plan?");
    if (!ok) return;

    await deleteDoc(doc(db, "rides", String(id)));
    r.push("/rides");
  }

  if (!uid) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Ride Plan</h1>
        <p>
          Please <a href="/login">login</a>.
        </p>
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

  if (!canRender || err || !ride) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Ride Plan</h1>
        <p style={{ color: "crimson" }}>{err ?? "Unknown error"}</p>
        <p>
          <a href="/rides">← Back</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <a href="/rides">← Back</a>
        <a href="/feed">Feed</a>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>{ride.title}</h1>
          <div style={{ opacity: 0.8, marginBottom: 16 }}>
            {(ride.transport || "").toUpperCase()} • {(ride.budget || "").toUpperCase()} • {(ride.status || "").toUpperCase()}
          </div>
        </div>

        {!isEditing ? (
          <button onClick={startEditing} style={{ padding: "10px 12px" }}>
            Edit
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={cancelEditing} disabled={saving} style={{ padding: "10px 12px" }}>
              Cancel
            </button>
            <button onClick={saveEdits} disabled={saving} style={{ padding: "10px 12px" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {saveMsg && <p style={{ color: "green", marginTop: 0 }}>{saveMsg}</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {!isEditing ? (
        <div style={{ display: "grid", gap: 8, border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div>
            <strong>Route:</strong> {ride.start} → {ride.end}
          </div>

          {Array.isArray(ride.stops) && ride.stops.length > 0 && (
            <div>
              <strong>Stops:</strong> {ride.stops.join(" → ")}
            </div>
          )}

          {(ride.startDateTime || ride.endDateTime) && (
            <div>
              <strong>Time:</strong>{" "}
              {ride.startDateTime ? new Date(ride.startDateTime).toLocaleString() : "—"} to{" "}
              {ride.endDateTime ? new Date(ride.endDateTime).toLocaleString() : "—"}
            </div>
          )}
        </div>
      ) : (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                Start
                <input value={start} onChange={(e) => setStart(e.target.value)} style={{ width: "100%", padding: 10 }} />
              </label>
              <label>
                End
                <input value={end} onChange={(e) => setEnd(e.target.value)} style={{ width: "100%", padding: 10 }} />
              </label>
            </div>

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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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

              <label>
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ width: "100%", padding: 10 }}>
                  <option value="planned">Planned</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                Start date & time
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  style={{ width: "100%", padding: 10 }}
                />
              </label>
              <label>
                End date & time
                <input
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  style={{ width: "100%", padding: 10 }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button onClick={removeRide} style={{ padding: "10px 12px" }}>
          Delete
        </button>
      </div>
    </main>
  );
}
