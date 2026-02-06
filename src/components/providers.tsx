"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useMutation } from "convex/react";
import { ReactNode, useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

function UserSync() {
  const { isSignedIn } = useAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (isSignedIn && !hasSynced.current) {
      hasSynced.current = true;
      ensureUser().catch((err) => {
        // Allow retry on next mount if it fails
        hasSynced.current = false;
        console.error("Failed to sync user:", err);
      });
    }
    if (!isSignedIn) {
      hasSynced.current = false;
    }
  }, [isSignedIn, ensureUser]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorBackground: "#000000",
          colorInputBackground: "#121212",
          colorPrimary: "#ededed",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <UserSync />
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
