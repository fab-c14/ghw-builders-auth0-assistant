import express from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const issuer = "https://dev-85sfso2plkov4xrh.us.auth0.com/";
const audience = "https://builders-week.local/profile";
const jwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));
const storePath = new URL("./settings.json", import.meta.url);

function readStore() {
  if (!existsSync(storePath)) return {};
  return JSON.parse(readFileSync(storePath, "utf8"));
}

function writeStore(store) {
  writeFileSync(storePath, JSON.stringify(store, null, 2));
}

async function userFrom(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    const error = new Error("Missing access token");
    error.status = 401;
    throw error;
  }
  const { payload } = await jwtVerify(token, jwks, { issuer, audience });
  return payload;
}

async function forecastFor(city) {
  const geoResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
  );
  const geo = await geoResponse.json();
  const place = geo.results?.[0];
  if (!place) {
    const error = new Error(`No forecast location for ${city}`);
    error.status = 404;
    throw error;
  }
  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code`,
  );
  const weather = await weatherResponse.json();
  return {
    city: place.name,
    country: place.country,
    temperature: weather.current?.temperature_2m,
    unit: weather.current_units?.temperature_2m || "°C",
    weatherCode: weather.current?.weather_code,
  };
}

const app = express();
app.use(express.json());

app.get("/api/settings", async (request, response) => {
  try {
    const user = await userFrom(request);
    const store = readStore();
    const settings = store[user.sub] || { city: "Bengaluru" };
    response.json({
      sub: user.sub,
      name: user.name || user.nickname || "there",
      city: settings.city,
    });
  } catch (error) {
    response.status(error.status || 401).json({ error: error.message });
  }
});

app.put("/api/settings", async (request, response) => {
  try {
    const user = await userFrom(request);
    const city = String(request.body?.city || "").trim();
    if (!city) {
      response.status(400).json({ error: "City is required" });
      return;
    }
    const store = readStore();
    store[user.sub] = { city };
    writeStore(store);
    response.json({ city });
  } catch (error) {
    response.status(error.status || 401).json({ error: error.message });
  }
});

app.get("/api/brief", async (request, response) => {
  try {
    const user = await userFrom(request);
    const store = readStore();
    const settings = store[user.sub] || { city: "Bengaluru" };
    const forecast = await forecastFor(settings.city);
    response.json({
      name: user.name || user.nickname || "there",
      city: settings.city,
      forecast,
    });
  } catch (error) {
    response.status(error.status || 500).json({ error: error.message });
  }
});

app.listen(8787, () => {
  console.log("profile api on http://localhost:8787");
});
