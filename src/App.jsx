import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const audience = "https://builders-week.local/profile";

export default function App() {
  const { isLoading, isAuthenticated, user, loginWithRedirect, logout, getAccessTokenSilently, error } = useAuth0();
  const [brief, setBrief] = useState(null);
  const [problem, setProblem] = useState("");
  const [city, setCity] = useState("");

  async function loadBrief() {
    const token = await getAccessTokenSilently({ authorizationParams: { audience } });
    const response = await fetch("/api/brief", { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "The profile API refused the token");
    setBrief(body);
    setCity(body.city);
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    loadBrief().catch((loadError) => {
      const code = loadError.error || loadError.message || "";
      if (/consent_required|login_required|missing_refresh_token|Consent required/i.test(String(code))) {
        loginWithRedirect({
          authorizationParams: { audience, scope: "openid profile email" },
        });
        return;
      }
      setProblem(loadError.message);
    });
  }, [isAuthenticated]);

  async function saveCity(event) {
    event.preventDefault();
    setProblem("");
    const token = await getAccessTokenSilently({ authorizationParams: { audience } });
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ city }),
    });
    const body = await response.json();
    if (!response.ok) {
      setProblem(body.error || "Could not save the city");
      return;
    }
    await loadBrief();
  }

  if (isLoading) return <main><p>Checking the Auth0 session.</p></main>;

  return (
    <main>
      <p className="kicker">Global Hack Week · Builders Week</p>
      <h1>Context Assistant</h1>
      {error ? <p className="error">{error.message}</p> : null}
      {problem ? <p className="error">{problem}</p> : null}
      {!isAuthenticated ? (
        <section>
          <p>Log in once. The assistant then reads your saved city and asks Open-Meteo for that place.</p>
          <button type="button" onClick={() => loginWithRedirect()}>Log in</button>
        </section>
      ) : (
        <section>
          {brief ? (
            <p className="reply">
              {user?.name || brief.name}, your saved city is {brief.city}. Open-Meteo says it is {brief.forecast.temperature}
              {brief.forecast.unit} in {brief.forecast.city} right now.
            </p>
          ) : (
            <p>Reading your profile settings.</p>
          )}
          <form onSubmit={saveCity}>
            <label htmlFor="city">City saved on your profile</label>
            <input id="city" value={city} onChange={(event) => setCity(event.target.value)} />
            <button type="submit">Save and refresh the forecast</button>
          </form>
          <button
            type="button"
            className="quiet"
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          >
            Log out
          </button>
        </section>
      )}
    </main>
  );
}
