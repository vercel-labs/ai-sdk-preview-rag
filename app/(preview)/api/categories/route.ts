import { db } from "@/lib/db";
import { resources } from "@/lib/db/schema/resources";
import { sql, count } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const categoryCounts = await db
      .select({
        rootCategory: resources.rootCategory,
        count: count(),
      })
      .from(resources)
      .where(sql`${resources.rootCategory} IS NOT NULL`)
      .groupBy(resources.rootCategory);

    const categoriesWithCounts = categoryCounts
      .filter((c) => c.rootCategory !== null)
      .map((c) => ({
        name: c.rootCategory as string,
        count: Number(c.count),
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ categories: categoriesWithCounts });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
