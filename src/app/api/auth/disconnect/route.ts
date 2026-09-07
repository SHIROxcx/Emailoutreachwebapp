import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET() {
  try {
    await prisma.mailboxConnection.deleteMany({});
    return NextResponse.redirect(APP_URL);
  } catch {
    return NextResponse.redirect(APP_URL);
  }
}
