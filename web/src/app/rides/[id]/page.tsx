"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { useParams, useRouter } from "next/navigation";

type RideUpdate = {
  at?: any; // Firestore timestamp
  text: string;
};

type Ride = {
  uid: string;
  title: string;
  start: string;
  end: string;
  stops?: string[];
  transport: string;
  budget: string;
  startDateTime?: string;
  endDateTime?: string;
  status: "planned" | "started" | "completed";
  createdAt?: any;

  // optional enhancements
  notesPre?: string;
  notesDuring?: string;
  notesPost?: string;

  mediaPlan?: {
    photos?: string;
    videos?: string;
  };

  updates?: RideUpdate[];
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Convert "YYYY-MM-DDTHH:mm" (from datetime-local) to ICS-friendly UTC-ish format
function toIcsDate(dtLocal?: string) {
  if (!dtLocal) return "";
  // If user provides local datetime, keep it as "floating time" without Z.
  // Many calendars interpret it in user's timezone.
  const [date, time] = dtLocal.split("T");
  if (!date || !time) return "";
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function RideDetailPage() {
  const r = useRouter();
  const params = useParams<{ id: string }>();
  const rideId = params?.id;

  const [uid, setUid] = useState<string | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // editable fields
  const [notesPre, setNotesPre] = useState("");
  const [notesDuring, setNotesDuring] = useState("");
  const [notesPost, setNotesPost] = useState("");
  const [photosPlan, setPhotosPlan] = useState("");
  const [videosPlan, setVideosPlan] = useState("");
  const [newUpdate, setNewUpdate] = useState("");

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null)), []);

  useEffect(() => {
    if (!rideId) return;
    setLoading(true);
    setErr(null);

    const ref = doc(db, "rides", String(rideId));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setLoading(false);
        if (!snap.exists()) {
          setRide(null);
          setErr("Ride not found.");
          return;
        }
        const data = snap.data() as any;
        const next: Ride = { ...(data as Ride) };
        setRide(next);

        setNotesPre(next.notesPre || "");
        setNotesDuring(next.notesDuring || "");
        setNotesPost(next.notesPost || "");
        setPhotosPlan(next.mediaPlan?.photos || "");
        setVideosPlan(next.mediaPlan?.videos || "");
      },
      (e) => {
        setLoading(false);
        setErr(e?.message || "Failed to load ride.");
      }
    );

    return () => unsub();
  }, [rideId]);

  const isOwner = useMemo(() => {
    if (!ride || !uid) return false;
    return ride.uid === uid;
  }, [ride, uid]);

  const routeLine = useMemo(() => {
    if (!ride) return "";
    const stops = (ride.stops || []).filter(Boolean);
    const full = [ride.start, ...stops, ride.end].filter(Boolean);
    return full.join(" → ");
  }, [ride]);

  async function saveExtras() {
    setErr(null);
    if (!rideId) return;
    if (!uid) return setErr("Please login first.");
    if (!ride) return setErr("Ride not found.");
    if (!isOwner) return setErr("You do not have access to edit this ride.");

    try {
      const ref = doc(db, "rides", String(rideId));
      await updateDoc(ref, {
        notesPre: notesPre || "",
        notesDuring: notesDuring || "",
        notesPost: notesPost || "",
        mediaPlan: {
          photos: photosPlan || "",
          videos: videosPlan || "",
        },
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      setErr(e?.message || "Failed to save.");
    }
  }

  async function setStatus(status: Ride["status"]) {
    setErr(null);
    if (!rideId) return;
    if (!uid) return setErr("Please login first.");
    if (!ride) return setErr("Ride not found.");
    if (!isOwner) return setErr("You do not have access to edit this ride.");

    try {
      const ref = doc(db, "rides", String(rideId));
      await updateDoc(ref, { status, updatedAt: serverTimestamp() });
    } catch (e: any) {
      setErr(e?.message || "Failed to update status.");
    }
  }

  async function addUpdate() {
    setErr(null);
    if (!rideId) return;
    if (!uid) return setErr("Please login first.");
    if (!ride) return setErr("Ride not found.");
    if (!isOwner) return setErr("You do not have access to edit this ride.");
    const text = newUpdate.trim();
    if (!text) return;

    try {
      const ref = doc(db, "rides", String(rideId));
      await updateDoc(ref, {
        updates: arrayUnion({
          text,
          at: serverTimestamp(),
        }),
        updatedAt: serverTimestamp(),
      });
      setNewUpdate("");
    } catch (e: any) {
      setErr(e?.message || "Failed to add update.");
    }
  }

  function downloadICS() {
    if (!ride) return;

    const dtStart = toIcsDate(ride.startDateTime);
    const dtEnd = toIcsDate(ride.endDateTime);

    const uidStr = `xbhp-${rideId}@local`;
    const now = new Date();
    const dtStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
      now.getUTCDate()
    )}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(
      now.getUTCSeconds()
    )}Z`;

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//xBhp//Ride Planner//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uidStr}`,
      `DTSTAMP:${dtStamp}`,
      `SUMMARY:${(ride.title || "xBhp Ride").replace(/\n/g, " ")}`,
      `DESCRIPTION:${(routeLine || "").replace(/\n/g, " ")}`,
      `LOCATION:${(ride.start || "").replace(/\n/g, " ")}`,
      dtStart ? `DTSTART:${dtStart}` : "",
      dtEnd ? `DTEND:${dtEnd}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean);

    downloadTextFile(`xBhp-ride-${rideId}.ics`, lines.join("\r\n"));
  }

  if (!uid) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Ride Detail</h1>
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

  if (!ride) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Ride Detail</h1>
        <p>{err || "Ride not found."}</p>
        <p>
          <a href="/rides">← Back to rides</a>
        </p>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>{ride.title}</h1>
        <p style={{ color: "crimson" }}>You don’t have access to this ride.</p>
        <p>
          <a href="/rides">← Back to rides</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <a href="/rides">← Back</a>
        <a href="/feed">Feed</a>
      </div>

      <h1 style={{ marginBottom: 6 }}>{ride.title}</h1>

      <div style={{ opacity: 0.85, marginBottom: 12 }}>
        <div><strong>Route:</strong> {routeLine}</div>
        <div style={{ fontSize: 13 }}>
          {(ride.transport || "").toUpperCase()} • {(ride.budget || "").toUpperCase()} •{" "}
          <strong>Status:</strong> {(ride.status || "planned").toUpperCase()}
        </div>
        <div style={{ fontSize: 13, marginTop: 4 }}>
          <strong>Dates:</strong>{" "}
          {ride.startDateTime ? ride.startDateTime : "—"}{" "}
          →{" "}
          {ride.endDateTime ? ride.endDateTime : "—"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <button onClick={() => setStatus("started")} style={{ padding: "10px 12px" }}>
          Mark Started
        </button>
        <button onClick={() => setStatus("completed")} style={{ padding: "10px 12px" }}>
          Mark Completed
        </button>
        <button onClick={downloadICS} style={{ padding: "10px 12px" }}>
          Download Calendar (.ics)
        </button>
        <button onClick={saveExtras} style={{ padding: "10px 12px" }}>
          Save Notes / Media Plan
        </button>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Notes</h2>

          <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            <div style={{ fontWeight: 600 }}>Pre-ride</div>
            <textarea value={notesPre} onChange={(e) => setNotesPre(e.target.value)} rows={4} style={{ padding: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            <div style={{ fontWeight: 600 }}>During ride</div>
            <textarea value={notesDuring} onChange={(e) => setNotesDuring(e.target.value)} rows={4} style={{ padding: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Post-ride</div>
            <textarea value={notesPost} onChange={(e) => setNotesPost(e.target.value)} rows={4} style={{ padding: 10 }} />
          </label>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Media Plan (what you intend to capture)</h2>

          <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            <div style={{ fontWeight: 600 }}>Photos list</div>
            <textarea
              value={photosPlan}
              onChange={(e) => setPhotosPlan(e.target.value)}
              rows={6}
              placeholder={"Example:\n- Departure shot\n- Road signs\n- Sunset timelapse\n- Landmark portrait"}
              style={{ padding: 10 }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Videos list</div>
            <textarea
              value={videosPlan}
              onChange={(e) => setVideosPlan(e.target.value)}
              rows={6}
              placeholder={"Example:\n- Bike start-up sound\n- POV ride segments\n- Drone clip\n- Arrival vibe"}
              style={{ padding: 10 }}
            />
          </label>
        </div>
      </section>

      <section style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Ride Updates (timeline notes)</h2>

        <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <input
            value={newUpdate}
            onChange={(e) => setNewUpdate(e.target.value)}
            placeholder="Add a quick update… (e.g., Reached Manali at 3pm, snow starts)"
            style={{ flex: 1, minWidth: 280, padding: 10 }}
          />
          <button onClick={addUpdate} style={{ padding: "10px 12px" }}>
            Add Update
          </button>
        </div>

        {!ride.updates || ride.updates.length === 0 ? (
          <p style={{ opacity: 0.8 }}>No updates yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {[...ride.updates].slice().reverse().map((u, idx) => (
              <div key={idx} style={{ padding: 10, border: "1px solid #eee", borderRadius: 10 }}>
                <div style={{ fontSize: 13, opacity: 0.75 }}>
                  {u.at?.toDate ? u.at.toDate().toLocaleString() : "Just now"}
                </div>
                <div>{u.text}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}