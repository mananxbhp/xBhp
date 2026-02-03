export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>xBhp</h1>
      <p>Welcome. Choose where to go:</p>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <a href="/signup">Signup</a>
        <a href="/login">Login</a>
        <a href="/feed">Feed</a>
      </div>
    </main>
  );
}
