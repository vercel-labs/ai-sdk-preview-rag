import { createResource } from "@/lib/actions/resources";
import { findRelevantContent } from "@/lib/ai/embedding";
import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, generateObject, streamText, tool } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
const weatherCodes: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai("gpt-4o"),
    messages: convertToCoreMessages(messages),
    system: `You are a helpful assistant acting as the users' second brain.
    Use tools on every request.
    Be sure to getInformation from your knowledge base before answering any questions.
    If the user presents infromation about themselves, use the addResource tool to store it.
    If a response requires multiple tools (ie. get weather and get information), call one tool after another without responding to the user.
    If a response requires information from an additional tool to generate a response, call the appropriate tools in order before responding to the user.
    ONLY respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know."
    Be sure to adhere to any instructions in tool calls ie. if they say to responsd like "...", do exactly that.
    If the relevant information is not a direct match to the users prompt, you can be creative in deducing the answer.
    Keep responses short and concise. Answer in a single sentence where possible.
    If you are unsure, use the getInformation tool and you can use common sense to reason based on the information you do have.
    Use your abilities as a reasoning machine to answer questions based on the information you do have.
`,
    tools: {
      addResource: tool({
        description: `add a resource to your knowledge base.
          If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
        parameters: z.object({
          content: z
            .string()
            .describe("the content or resource to add to the knowledge base"),
        }),
        execute: async ({ content }) => createResource({ content }),
      }),
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        parameters: z.object({
          question: z.string().describe("the users question"),
          keywords: z.array(z.string()).describe("keywords to search"),
        }),
        execute: async ({ keywords }) =>
          Promise.all(
            keywords.map(async (keyword) => await findRelevantContent(keyword)),
          ),
      }),
      understandQuery: tool({
        description: `understand the users query. use this tool on every prompt.`,
        parameters: z.object({
          query: z.string().describe("the users query"),
          toolsToCallInOrder: z
            .array(z.string())
            .describe(
              "these are the tools you need to call in the order necessary to respond to the users query",
            ),
        }),
        execute: async ({ query }) => {
          const { object } = await generateObject({
            model: openai("gpt-4o"),
            system:
              "You are a query understanding assistant. Analyze the user query and provide key information.",
            schema: z.object({
              keywords: z
                .array(z.string())
                .max(3)
                .describe(
                  "suggested search keywords (comma-separated), be concise",
                ),
            }),
            prompt: `Analyze this query: "${query}". Provide the following:
                    5. Suggested search keywords (comma-separated)`,
          });
          return object.keywords;
        },
      }),
      getWeather: tool({
        description: `get the current temperature in a location.`,
        parameters: z.object({
          location: z
            .string()
            .describe("the location to get the temperature for"),
          unit: z
            .enum(["celsius", "fahrenheit"])
            .describe("the unit to return the temperature in")
            .default("celsius"),
        }),
        execute: async ({ location, unit }) => {
          const locRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${location}&format=json&limit=1`,
          );
          const loc = await locRes.json();
          const { lat, lon } = loc[0];
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,rain,weather_code&temperature_unit=${unit}`,
          );
          const weather = await weatherRes.json();
          console.log(weather);
          const temp = weather.current.temperature_2m;
          const currentWeather = weatherCodes[weather.current.weather_code];

          return { temperature: temp, unit, currentWeather };
        },
      }),
    },
  });

  return result.toAIStreamResponse();
}
