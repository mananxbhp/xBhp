export type RideForCalendar = {
  title: string;
  startIso: string; // e.g. "2026-02-10T06:00"
  endIso: string;   // e.g. "2026-02-10T18:00"
  location?: string;
  description?: string;
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

// Convert "2026-02-10T06:00" to "20260210T060000"
function toICSDateTime(localIso: string) {
  const d = new Date(localIso);
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    "00"
  );
}

export function buildRideICS(ride: RideForCalendar) {
  const dtStart = toICSDateTime(ride.startIso);
  const dtEnd = toICSDateTime(ride.endIso);
  const uid = `xbhp-${Date.now()}@xbhp`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//xBhp//Ride Planner//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICSDateTime(new Date().toISOString().slice(0, 16))}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(ride.title)}`,
    ride.location ? `LOCATION:${escapeICS(ride.location)}` : "",
    ride.description ? `DESCRIPTION:${escapeICS(ride.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

function escapeICS(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function googleCalendarCreateLink(ride: RideForCalendar) {
  // Google expects UTC-ish format or basic format. We'll use local converted to Date and then UTC ISO-like.
  const s = new Date(ride.startIso);
  const e = new Date(ride.endIso);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); // 20260210T003000Z

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ride.title,
    dates: `${fmt(s)}/${fmt(e)}`,
    details: ride.description ?? "",
    location: ride.location ?? "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}