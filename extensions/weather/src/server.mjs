// The weather extension's MCP server: today's weather and forecast for the person's city, from
// Open-Meteo (free, no key). Its settings come as variables, filled in from the extension's options.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const city = process.env.WEATHER_CITY ?? "";
const imperial = process.env.WEATHER_UNITS === "imperial";

const server = new McpServer(
  { name: "weather", version: "0.1.0" },
  { instructions: "The person's weather: forecast for their city (today and the next days). Use it before suggesting plans that depend on the weather; never guess the weather." },
);

/** Where a city is, from Open-Meteo's geocoding. */
async function locate(name) {
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`);
  const place = (await response.json()).results?.[0];
  if (!place) throw new Error(`No place called ${name}.`);
  return place;
}

server.registerTool(
  "forecast",
  {
    title: "Weather forecast",
    description: "The weather now and the forecast for the next days in the person's city (or another, if they name one): temperature, rain chance and wind.",
    inputSchema: { city: z.string().optional().describe("Another city than the person's"), days: z.number().int().min(1).max(7).default(1) },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ city: other, days }) => {
    const name = other || city;
    if (!name) return { isError: true, content: [{ type: "text", text: "No city set: the person sets it in the extension's settings (city)." }] };
    const place = await locate(name);
    const units = imperial ? "&temperature_unit=fahrenheit&wind_speed_unit=mph" : "";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=${days}${units}`;
    const data = await (await fetch(url)).json();
    const t = imperial ? "°F" : "°C";
    const lines = [
      `${place.name} (${place.country}): now ${data.current.temperature_2m}${t}, wind ${data.current.wind_speed_10m} ${imperial ? "mph" : "km/h"}.`,
      ...data.daily.time.map((day, i) => `${day}: ${data.daily.temperature_2m_min[i]}–${data.daily.temperature_2m_max[i]}${t}, rain ${data.daily.precipitation_probability_max[i]}%.`),
    ];
    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

await server.connect(new StdioServerTransport());
