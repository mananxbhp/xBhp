"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseClient";
import {
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

type Ride = {
  uid: string;
  title: string;
  start: string;
  end: string;
  stops?: string[];
  transport?: string;
  budget?: string;
  startDateTime?: string; // "YYYY-MM-DDTHH:mm"
  endDateTime?: string;
  status?: "planned" | "ongoing" | "completed";
  createdAt?: any;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Converts "2026-02-03T17:40" (local) -> "20260203T121000Z" (UTC)
// If empty, returns empty string.
function toICSDateTime(dtLocal?: string) {
  if (!dtLocal) return "";
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.getUTCFullYear() +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) +
    "T" +
    pad2(d.getUTCHours()) +
    pad2(d.getUTCMinutes()) +
    pad2(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeICS(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Auth
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null));
  }, []);

  // Ride doc listener
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setErr(null);

    const ref = doc(db, "rides", String(id));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRide(null);
          setLoading(false);
          return;
        }
        setRide(snap.data() as Ride);
        setLoading(false);
      },
      (e) => {
        setErr(e?.message ?? "Failed to load ride");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  const isOwner = !!uid && !!ride?.uid && uid === ride.uid;

  const icsText = useMemo(() => {
    if (!ride) return "";

    const title = ride.title || "Ride Plan";
    const location = [ride.start, ...(ride.stops ?? []), ride.end]
      .filter(Boolean)
      .join(" → ");

    const descLines = [
      `Transport: ${ride.transport ?? "-"}`,
      `Budget: ${ride.budget ?? "-"}`,
      `Status: ${ride.status ?? "planned"}`,
      "",
      "Route:",
      location,
    ];

    const dtStart = toICSDateTime(ride.startDateTime);
    const dtEnd = toICSDateTime(ride.endDateTime);

    // If no start/end datetime, create an all-day event fallback (today)
    // (ICS needs either DTSTART/DTEND or DTSTART; we keep it simple)
    const now = new Date();
    const y = now.getFullYear();
    const m = pad2(now.getMonth() + 1);
    const d = pad2(now.getDate());
    const fallbackAllDay = `${y}${m}${d}`;

    const uidStr = `${String(id)}@xbhp.local`;

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//xBhp//Ride Planner//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uidStr}`,
      `SUMMARY:${escapeICS(title)}`,
      `LOCATION:${escapeICS(location)}`,
      `DESCRIPTION:${escapeICS(descLines.join("\n"))}`,
      dtStart ? `DTSTART:${dtStart}` : `DTSTART;VALUE=DATE:${fallbackAllDay}`,
      dtEnd ? `DTEND:${dtEnd}` : undefined,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean) as string[];

    return lines.join("\r\n");
  }, [ride, id]);

  function downloadICS() {
    if (!icsText) return;
    const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(ride?.title || "ride-plan").replace(/\s+/g, "-")}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function setStatus(status: "planned" | "ongoing" | "completed") {
    if (!id) return;
    setErr(null);
    if (!isOwner) return setErr("Not allowed.");
    setBusy(true);
    try {
      await updateDoc(doc(db, "rides", String(id)), { status });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  async function removeRide() {
    if (!id) return;
    setErr(null);
    if (!isOwner) return setErr("Not allowed.");

    const ok = confirm("Delete this ride plan permanently?");
    if (!ok) return;

    setBusy(true);
    try {
      await deleteDoc(doc(db, "rides", String(id)));
      r.push("/rides");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to delete ride");
    } finally {
      setBusy(false);
    }
  }

  // If user not logged in
  if (!uid) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Ride Details</h1>
        <p>Please <a href="/login">login</a>.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <p>Loading...</p>
      </main>
    );
  }

  if (!ride) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Ride not found</h1>
        <p><a href="/rides">Back to My Rides</a></p>
      </main>
    );
  }

  // Logged in but not owner
  if (!isOwner) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Not allowed</h1>
        <p>This ride plan belongs to another user.</p>
        <p><a href="/rides">Back to My Rides</a></p>
      </main>
    );
  }

  const routeLine = [ride.start, ...(ride.stops ?? []), ride.end].filter(Boolean).join(" → ");

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>{ride.title}</h1>
          <div style={{ opacity: 0.8, marginTop: 6 }}>{routeLine}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <a href="/rides">← Back</a>
          <a href="/rides/new">+ New</a>
          <button onClick={downloadICS} disabled={busy} style={{ padding: "8px 10px" }}>
            Export Calendar (.ics)
          </button>
        </div>
      </div>

      <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span><b>Transport:</b> {(ride.transport ?? "-").toUpperCase()}</span>
          <span><b>Budget:</b> {(ride.budget ?? "-").toUpperCase()}</span>
          <span><b>Status:</b> {(ride.status ?? "planned").toUpperCase()}</span>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Start date & time</div>
            <div style={{ opacity: 0.85 }}>{ride.startDateTime || "-"}</div>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>End date & time</div>
            <div style={{ opacity: 0.85 }}>{ride.endDateTime || "-"}</div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Stops</div>
          {(ride.stops?.length ?? 0) === 0 ? (
            <div style={{ opacity: 0.85 }}>No stops</div>
          ) : (
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {(ride.stops ?? []).map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setStatus("planned")} disabled={busy} style={{ padding: "10px 12px" }}>
          Mark Planned
        </button>
        <button onClick={() => setStatus("ongoing")} disabled={busy} style={{ padding: "10px 12px" }}>
          Mark Ongoing
        </button>
        <button onClick={() => setStatus("completed")} disabled={busy} style={{ padding: "10px 12px" }}>
          Mark Completed
        </button>

        <div style={{ flex: 1 }} />

        <button onClick={removeRide} disabled={busy} style={{ padding: "10px 12px" }}>
          Delete Ride
        </button>
      </div>

      {err && <p style={{ color: "crimson", marginTop: 12 }}>{err}</p>}
    </main>
  );
}
