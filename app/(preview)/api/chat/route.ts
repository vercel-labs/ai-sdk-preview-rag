import { createResource } from "@/lib/actions/resources";
import { findRelevantContent } from "@/lib/ai/embedding";
import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, generateObject, streamText, tool } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export const addResourceParams = z.object({
  content: z
    .string()
    .describe("the content or resource to add to the knowledge base"),
});

export const getInformationParams = z.object({
  question: z.string().describe("the users question"),
  similarQuestions: z.array(z.string()).describe("keywords to search"),
});

export const understandQueryParams = z.object({
  query: z.string().describe("the users query"),
  toolsToCallInOrder: z
    .array(z.string())
    .describe(
      "these are the tools you need to call in the order necessary to respond to the users query",
    ),
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai("gpt-4o"),
    messages: convertToCoreMessages(messages),
    system: `You are a helpful assistant acting as the users' second brain.
      ...`, // truncated for brevity
    tools: {
      addResource: tool({
        description: `add a resource to your knowledge base.
            If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
        parameters: addResourceParams,
        execute: async ({ content }) => createResource({ content }),
      }),
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        parameters: getInformationParams,
        execute: async ({ similarQuestions }) => {
          const results = await Promise.all(
            similarQuestions.map(
              async (question: string) => await findRelevantContent(question),
            ),
          );
          const uniqueResults = Array.from(
            new Map(results.flat().map((item) => [item?.name, item])).values(),
          );

          return uniqueResults;
        },
      }),
      understandQuery: tool({
        description: `understand the users query. use this tool on every prompt.`,
        parameters: understandQueryParams,
        execute: async ({ query }) => {
          const { object } = await generateObject({
            model: openai("gpt-4o"),
            system:
              "You are a query understanding assistant. Analyze the user query and generate similar questions.",
            schema: z.object({
              questions: z
                .array(z.string())
                .max(3)
                .describe("similar questions to the user's query. be concise."),
            }),
            prompt: `Analyze this query: "${query}". Provide the following:
                      3 similar questions that could help answer the user's query`,
          });
          return object.questions;
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
