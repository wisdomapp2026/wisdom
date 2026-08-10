import { useState, useEffect } from "react";
import { supabase } from "@shared/supabase";

export interface AdaptedUser {
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
  provider: string | undefined;
}

/** Supabase session foydalanuvchisini ilova ichki formatiga o'tkazish */
function adapt(sessionUser: { id: string; email?: string; user_metadata?: Record<string, any>; app_metadata?: Record<string, any> }): AdaptedUser {
  return {
    uid: sessionUser.id,
    email: sessionUser.email,
    displayName: sessionUser.user_metadata?.name || sessionUser.user_metadata?.displayName,
    provider: sessionUser.app_metadata?.provider,
  };
}

export function useAuth() {
  const [user, setUser] = useState<AdaptedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialSessionHandled = false;

    // 1. Mavjud sessiyani olish
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialSessionHandled) {
        setUser(session?.user ? adapt(session.user) : null);
        setLoading(false);
        initialSessionHandled = true;
      }
    });

    // 2. Auth o'zgarishlarini kuzatish
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION — getSession bilan dublikat bo'lmasligi uchun
      if (event === "INITIAL_SESSION") {
        if (!initialSessionHandled) {
          setUser(session?.user ? adapt(session.user) : null);
          setLoading(false);
          initialSessionHandled = true;
        }
        return;
      }

      // SIGNED_OUT — faqat haqiqiy chiqish
      if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
        return;
      }

      // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED — user yangilanadi
      if (session?.user) {
        setUser(adapt(session.user));
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = () => supabase.auth.signOut();

  return { user, loading, logout, isLoggedIn: !!user };
}
