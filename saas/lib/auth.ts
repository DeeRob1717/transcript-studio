import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function getOrCreateCurrentDbUser() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("Authenticated user does not have an email address.");
  }

  const existing = await db.user.findUnique({
    where: { clerkUserId: userId }
  });

  if (existing) {
    return existing;
  }

  return db.user.create({
    data: {
      clerkUserId: userId,
      email,
      fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null
    }
  });
}

