import { useState, useEffect } from "react";
import { supabase } from "@shared/supabase";

export interface AdaptedUser {
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
}

/** Supabase session foydalanuvchisini ilova ichki formatiga o'tkazish */
function adapt(sessionUser: { id: string; email?: string; user_metadata?: Record<string, any> }): AdaptedUser {
  return {
    uid: sessionUser.id,
    email: sessionUser.email,
    displayName: sessionUser.user_metadata?.name || sessionUser.user_metadata?.displayName,
  };
}

export function useAuth() {
  const [user, setUser] = useState<AdaptedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Mavjud sessiyani olish
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? adapt(session.user) : null);
      setLoading(false);
    });

    // 2. Auth o'zgarishlarini kuzatish
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? adapt(session.user) : null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = () => supabase.auth.signOut();

  return { user, loading, logout, isLoggedIn: !!user };
}
