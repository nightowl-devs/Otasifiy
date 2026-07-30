"use client";

import { createContext, useContext } from "react";
import type { User } from "@/generated/prisma";

type SafeUser = Omit<User, "githubToken">;

const UserContext = createContext<SafeUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: SafeUser;
  children: React.ReactNode;
}) {
  return <UserContext value={user}>{children}</UserContext>;
}

export function useUser(): SafeUser {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("useUser must be used within a <UserProvider>");
  }
  return user;
}
