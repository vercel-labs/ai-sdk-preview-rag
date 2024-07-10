"use server";

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from "@/lib/db/schema/resources";
import { generateEmbeddings } from "../ai/embedding";
import { db } from "../db";
import { embeddings } from "../db/schema/embeddings";

export const createResource = async (input: NewResourceParams) => {
  try {
    const { content } = insertResourceSchema.parse(input);

    const [resource] = await db
      .insert(resources)
      .values({ content })
      .returning();

    const e = await generateEmbeddings(content);
    await db
      .insert(embeddings)
      .values(
        e.map((embedding) => ({ resourceId: resource.id, ...embedding })),
      );
    return "Resource successfully created and embedded.";
  } catch (e) {
    if (e instanceof Error)
      return e.message.length > 0 ? e.message : "Error, please try again.";
  }
};
