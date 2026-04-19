import { embed, embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getVercelOidcToken } from "@vercel/functions/oidc";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";
import { db } from "../db";

async function getEmbeddingModel() {
  const openai = createOpenAI({
    baseURL: "https://ai-gateway.vercel.sh/v1",
    apiKey: await getVercelOidcToken(),
  });
  return openai.embedding("text-embedding-ada-002");
}

const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split(".")
    .filter((i) => i !== "");
};

export const generateEmbeddings = async (
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  const { embeddings } = await embedMany({
    model: await getEmbeddingModel(),
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\n", " ");
  const { embedding } = await embed({
    model: await getEmbeddingModel(),
    value: input,
  });
  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, userQueryEmbedded)})`;
  const similarGuides = await db
    .select({ name: embeddings.content, similarity })
    .from(embeddings)
    .where(gt(similarity, 0.3))
    .orderBy((t) => desc(t.similarity))
    .limit(4);
  return similarGuides;
};
