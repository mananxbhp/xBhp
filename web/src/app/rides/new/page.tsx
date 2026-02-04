"use client";

<<<<<<< HEAD
import { useEffect, useState } from "react";
=======
import { useEffect, useMemo, useState } from "react";
>>>>>>> be82b89 (Add create ride plan page)
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { useRouter } from "next/navigation";

<<<<<<< HEAD
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

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null));
  }, []);

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
        <p>Please <a href="/login">login</a>.</p>
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
=======
type Stop = { label: string };

function simpleAISummary(input: {
  start: string;
  end: string;
  stops: string[];
  transport: string;
  budget: string;
  season: string;
  food: string;
  clothing: string;
}) {
  const via = input.stops.filter(Boolean);
  const viaText = via.length ? ` via ${via.join(" → ")}` : "";
  return [
    `Route: ${input.start} → ${input.end}${viaText}`,
    `Transport: ${input.transport}`,
    `Best time (approx): ${input.season || "Depends on weather; avoid peak rush hours and plan early mornings for riding."}`,
    `Stay: Budget ${input.budget || "mid"} — choose stays near the day’s destination with secure parking.`,
    `Clothing: ${input.clothing || "Layering recommended; carry rain/wind protection."}`,
    `Food: ${input.food || "Prefer clean, popular local spots; hydrate regularly."}`,
  ].join("\n");
}

export default function NewRidePage() {
  const r = useRouter();
  const [uid, setUid] = useState<string | null>(null);

  const [title, setTitle] = useState("My Ride Plan");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [transport, setTransport] = useState<"bike" | "car" | "other">("bike");

  const [budget, setBudget] = useState<"low" | "mid" | "high">("mid");
  const [startDateTime, setStartDateTime] = useState(""); // "YYYY-MM-DDTHH:mm"
  const [endDateTime, setEndDateTime] = useState("");

  const [seasonPref, setSeasonPref] = useState("");
  const [foodPref, setFoodPref] = useState("");
  const [clothingPref, setClothingPref] = useState("");

  const [aiPlan, setAiPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) r.push("/login");
      else setUid(u.uid);
    });
  }, [r]);

  const stopLabels = useMemo(() => stops.map((s) => s.label.trim()).filter(Boolean), [stops]);

  function addStop() {
    setStops((p) => [...p, { label: "" }]);
  }
  function updateStop(i: number, v: string) {
    setStops((p) => p.map((s, idx) => (idx === i ? { ...s, label: v } : s)));
  }
  function removeStop(i: number) {
    setStops((p) => p.filter((_, idx) => idx !== i));
  }

  function generateAI() {
    const summary = simpleAISummary({
      start,
      end,
      stops: stopLabels,
      transport,
      budget,
      season: seasonPref,
      food: foodPref,
      clothing: clothingPref,
    });
    setAiPlan(summary);
  }

  async function saveRide() {
    setErr(null);
    if (!uid) return;
    if (!start.trim() || !end.trim()) {
      setErr("Start and End destinations are required.");
      return;
    }
    if (!startDateTime || !endDateTime) {
      setErr("Start Date/Time and End Date/Time are required (for calendar reminders).");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        uid,
        title: title.trim() || "My Ride Plan",
        start: start.trim(),
        end: end.trim(),
        stops: stopLabels,
        transport,
        budget,
        startDateTime,
        endDateTime,
        preferences: {
          season: seasonPref,
          food: foodPref,
          clothing: clothingPref,
        },
        aiPlan: aiPlan || "",
        status: "planned", // planned | active | complete (later)
        createdAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, "rides"), payload);
      r.push(`/rides/${ref.id}`);
    } catch (e: any) {
      setErr(e?.message || "Failed to save ride");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1>Create Ride Plan</h1>
      <p><a href="/rides">← Back to My Rides</a></p>

      <div style={{ display: "grid", gap: 12 }}>
        <label>
          Title
          <input style={{ width: "100%", padding: 8 }} value={title} onChange={(e) => setTitle(e.target.value)} />
>>>>>>> be82b89 (Add create ride plan page)
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
<<<<<<< HEAD
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
}
=======
            Start
            <input style={{ width: "100%", padding: 8 }} value={start} onChange={(e) => setStart(e.target.value)} placeholder="Delhi" />
          </label>
          <label>
            End
            <input style={{ width: "100%", padding: 8 }} value={end} onChange={(e) => setEnd(e.target.value)} placeholder="Manali" />
          </label>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Stops (optional)</strong>
            <button onClick={addStop} type="button">+ Add Stop</button>
          </div>

          {stops.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <input
                style={{ padding: 8 }}
                value={s.label}
                onChange={(e) => updateStop(i, e.target.value)}
                placeholder={`Stop #${i + 1} (e.g., Chandigarh)`}
              />
              <button type="button" onClick={() => removeStop(i)}>Remove</button>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label>
            Transport
            <select style={{ width: "100%", padding: 8 }} value={transport} onChange={(e) => setTransport(e.target.value as any)}>
              <option value="bike">Bike</option>
              <option value="car">Car</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label>
            Budget
            <select style={{ width: "100%", padding: 8 }} value={budget} onChange={(e) => setBudget(e.target.value as any)}>
              <option value="low">Low</option>
              <option value="mid">Mid</option>
              <option value="high">High</option>
            </select>
          </label>

          <div />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Start Date/Time
            <input style={{ width: "100%", padding: 8 }} type="datetime-local" value={startDateTime} onChange={(e) => setStartDateTime(e.target.value)} />
          </label>
          <label>
            End Date/Time
            <input style={{ width: "100%", padding: 8 }} type="datetime-local" value={endDateTime} onChange={(e) => setEndDateTime(e.target.value)} />
          </label>
        </div>

        <h3>Preferences (optional)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label>
            Best time / season note
            <input style={{ width: "100%", padding: 8 }} value={seasonPref} onChange={(e) => setSeasonPref(e.target.value)} placeholder="e.g., Avoid monsoon; start early mornings" />
          </label>
          <label>
            Food preference
            <input style={{ width: "100%", padding: 8 }} value={foodPref} onChange={(e) => setFoodPref(e.target.value)} placeholder="e.g., High-protein, local, hygienic stops" />
          </label>
          <label>
            Clothing / gear preference
            <input style={{ width: "100%", padding: 8 }} value={clothingPref} onChange={(e) => setClothingPref(e.target.value)} placeholder="e.g., Layering + rain liner + gloves" />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" onClick={generateAI}>Generate AI Plan</button>
          <button type="button" onClick={saveRide} disabled={saving}>
            {saving ? "Saving..." : "Save Ride Plan"}
          </button>
        </div>

        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <label>
          AI Plan (editable)
          <textarea
            style={{ width: "100%", padding: 8, minHeight: 180, whiteSpace: "pre-wrap" }}
            value={aiPlan}
            onChange={(e) => setAiPlan(e.target.value)}
            placeholder="Click 'Generate AI Plan' to auto-fill..."
          />
        </label>
      </div>
    </main>
  );
}
>>>>>>> be82b89 (Add create ride plan page)
