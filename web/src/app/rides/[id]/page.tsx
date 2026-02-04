"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
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

type ContentItem = {
  id: string;
  uid: string;
  kind: "photo" | "video" | "blog";
  title: string;
  caption?: string;
  url?: string;
  body?: string;
  createdAt?: any;
  updatedAt?: any;
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

  // Ride editing state
  const [isEditingRide, setIsEditingRide] = useState(false);
  const [rideSaving, setRideSaving] = useState(false);
  const [rideMsg, setRideMsg] = useState<string | null>(null);

  // Ride form state
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [stops, setStops] = useState<string[]>([""]);
  const [transport, setTransport] = useState<"bike" | "car">("bike");
  const [budget, setBudget] = useState<"budget" | "mid" | "luxury">("mid");
  const [status, setStatus] = useState<"planned" | "ongoing" | "completed" | "cancelled">("planned");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");

  // Content state
  const [content, setContent] = useState<ContentItem[]>([]);
  const [contentErr, setContentErr] = useState<string | null>(null);
  const [contentMsg, setContentMsg] = useState<string | null>(null);
  const [contentSaving, setContentSaving] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);

  const [cKind, setCKind] = useState<ContentItem["kind"]>("photo");
  const [cTitle, setCTitle] = useState("");
  const [cUrl, setCUrl] = useState("");
  const [cCaption, setCCaption] = useState("");
  const [cBody, setCBody] = useState("");

  // auth
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null)), []);

  // ride listener
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

        // keep form in sync only when NOT editing ride
        if (!isEditingRide) {
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
  }, [uid, id, isEditingRide]);

  // content listener
  useEffect(() => {
    if (!uid || !id) return;

    const q2 = query(collection(db, "rides", String(id), "content"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q2,
      (snap) => {
        setContentErr(null);
        setContent(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );
      },
      (e) => setContentErr(e?.message ?? "Failed to load content")
    );

    return () => unsub();
  }, [uid, id]);

  const canRender = useMemo(() => uid && id, [uid, id]);

  // ride helpers
  function updateStop(i: number, value: string) {
    setStops((prev) => prev.map((x, idx) => (idx === i ? value : x)));
  }
  function addStop() {
    setStops((prev) => [...prev, ""]);
  }
  function removeStop(i: number) {
    setStops((prev) => prev.filter((_, idx) => idx !== i));
  }

  function startEditingRide() {
    if (!ride) return;
    setRideMsg(null);
    setIsEditingRide(true);

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

  function cancelEditingRide() {
    setIsEditingRide(false);
    setRideMsg(null);
  }

  async function saveEditsRide() {
    if (!uid || !id) return;
    setRideMsg(null);
    setErr(null);

    if (!title.trim()) return setErr("Title is required.");
    if (!start.trim() || !end.trim()) return setErr("Start and End are required.");

    setRideSaving(true);
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

      setIsEditingRide(false);
      setRideMsg("Saved ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save");
    } finally {
      setRideSaving(false);
    }
  }

  async function removeRide() {
    if (!id) return;
    const ok = confirm("Delete this ride plan?");
    if (!ok) return;

    await deleteDoc(doc(db, "rides", String(id)));
    r.push("/rides");
  }

  // content helpers
  function resetContentForm() {
    setCKind("photo");
    setCTitle("");
    setCUrl("");
    setCCaption("");
    setCBody("");
    setIsAdding(false);
    setEditing(null);
    setContentErr(null);
  }

  function startAddContent() {
    resetContentForm();
    setContentMsg(null);
    setIsAdding(true);
  }

  function startEditContent(x: ContentItem) {
    setEditing(x);
    setIsAdding(false);
    setCKind(x.kind);
    setCTitle(x.title ?? "");
    setCUrl(x.url ?? "");
    setCCaption(x.caption ?? "");
    setCBody(x.body ?? "");
    setContentErr(null);
    setContentMsg(null);
  }

  async function saveContent() {
    try {
      if (!uid || !id) {
        setContentErr("Not logged in / missing ride id.");
        return;
      }

      if (!cTitle.trim()) return setContentErr("Title is required.");
      if ((cKind === "photo" || cKind === "video") && !cUrl.trim()) return setContentErr("URL is required for Photo/Video.");

      setContentErr(null);
      setContentMsg(null);
      setContentSaving(true);

      const payload: any = {
        uid, // IMPORTANT for rules
        kind: cKind,
        title: cTitle.trim(),
        caption: cCaption.trim(),
        updatedAt: serverTimestamp(),
      };

      if (cKind === "blog") payload.body = cBody || "";
      else payload.url = cUrl.trim();

      console.log("[saveContent] uid,id,payload", uid, id, payload);

      if (editing) {
        await updateDoc(doc(db, "rides", String(id), "content", editing.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        const ref = await addDoc(collection(db, "rides", String(id), "content"), payload);
        console.log("[saveContent] created doc:", ref.id);
      }

      setContentMsg("Saved ✅");
      resetContentForm();
    } catch (e: any) {
      console.error("[saveContent] error", e);
      setContentErr(e?.message ?? String(e) ?? "Failed to save content");
    } finally {
      setContentSaving(false);
    }
  }

  async function deleteContent(x: ContentItem) {
    if (!id) return;
    const ok = confirm("Delete this content item?");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "rides", String(id), "content", x.id));
      setContentMsg("Deleted ✅");
    } catch (e: any) {
      setContentErr(e?.message ?? "Failed to delete content");
    }
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

        {!isEditingRide ? (
          <button onClick={startEditingRide} style={{ padding: "10px 12px" }}>
            Edit
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={cancelEditingRide} disabled={rideSaving} style={{ padding: "10px 12px" }}>
              Cancel
            </button>
            <button onClick={saveEditsRide} disabled={rideSaving} style={{ padding: "10px 12px" }}>
              {rideSaving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {rideMsg && <p style={{ color: "green", marginTop: 0 }}>{rideMsg}</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {!isEditingRide ? (
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

      {/* Ride Content */}
      <div style={{ marginTop: 18 }}>
        <h2 style={{ marginBottom: 8 }}>Ride Content</h2>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button onClick={startAddContent} style={{ padding: "10px 12px" }}>
            + Add Photo / Video / Blog
          </button>
        </div>

        {contentErr && <p style={{ color: "crimson" }}>{contentErr}</p>}
        {contentMsg && <p style={{ color: "green" }}>{contentMsg}</p>}

        {(isAdding || editing) && (
          <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <strong>{editing ? "Edit Content" : "Add Content"}</strong>
              <button onClick={resetContentForm} style={{ padding: "8px 10px" }}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <label>
                Type
                <select value={cKind} onChange={(e) => setCKind(e.target.value as any)} style={{ width: "100%", padding: 10 }}>
                  <option value="photo">Photo (link)</option>
                  <option value="video">Video (link)</option>
                  <option value="blog">Blog (text)</option>
                </select>
              </label>

              <label>
                Title
                <input value={cTitle} onChange={(e) => setCTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
              </label>

              {(cKind === "photo" || cKind === "video") && (
                <label>
                  URL
                  <input
                    value={cUrl}
                    onChange={(e) => setCUrl(e.target.value)}
                    placeholder="Paste link (YouTube/Instagram/Drive etc.)"
                    style={{ width: "100%", padding: 10 }}
                  />
                </label>
              )}

              <label>
                Caption (optional)
                <input value={cCaption} onChange={(e) => setCCaption(e.target.value)} style={{ width: "100%", padding: 10 }} />
              </label>

              {cKind === "blog" && (
                <label>
                  Blog Text
                  <textarea value={cBody} onChange={(e) => setCBody(e.target.value)} rows={8} style={{ width: "100%", padding: 10 }} />
                </label>
              )}

              <button onClick={saveContent} disabled={contentSaving} style={{ padding: 12 }}>
                {contentSaving ? "Saving…" : editing ? "Save Changes" : "Add Content"}
              </button>
            </div>
          </div>
        )}

        {content.length === 0 ? (
          <p>No content yet. Add your first photo/video/blog.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {content.map((x) => (
              <div key={x.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <strong>{x.title}</strong>
                    <div style={{ opacity: 0.7, fontSize: 13 }}>{x.kind.toUpperCase()}</div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => startEditContent(x)} style={{ padding: "8px 10px" }}>
                      Edit
                    </button>
                    <button onClick={() => deleteContent(x)} style={{ padding: "8px 10px" }}>
                      Delete
                    </button>
                  </div>
                </div>

                {x.caption && <p style={{ marginTop: 10 }}>{x.caption}</p>}

                {x.kind === "blog" ? (
                  <pre style={{ whiteSpace: "pre-wrap", marginTop: 10, fontFamily: "inherit" }}>{x.body || ""}</pre>
                ) : (
                  <p style={{ marginTop: 10 }}>
                    <a href={x.url} target="_blank" rel="noreferrer">
                      {x.url}
                    </a>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button onClick={removeRide} style={{ padding: "10px 12px" }}>
          Delete Ride Plan
        </button>
      </div>
    </main>
  );
}
