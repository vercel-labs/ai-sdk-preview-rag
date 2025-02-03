"use server";

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from "@/lib/db/schema/resources";
import { generateEmbeddings } from "../ai/embedding";
import { db } from "../db";
import { embeddings as embeddingsTable } from "../db/schema/embeddings";

export const createResource = async (input: NewResourceParams) => {
  try {
    const parsedInput = insertResourceSchema.parse(input);
    const { content } = parsedInput;

    if (typeof content !== 'string') {
      throw new Error("Content must be a string");
    }

    const [resource] = await db
      .insert(resources)
      .values([{ content }]) // Ensure values is an array of objects
      .returning();

    const embeddings = await generateEmbeddings(content);
    await db.insert(embeddingsTable).values(
      embeddings.map((embedding) => ({
        resourceId: resource.id,
        ...embedding,
      }))
    );

    return resource;
  } catch (error) {
    console.error("Error creating resource:", error);
    throw error;
  }
};
