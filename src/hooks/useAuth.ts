import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session ?? null);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
        });

        return () => subscription.unsubscribe();
    }, []);

    const user = session?.user ?? null;
    const userId = user?.id ?? null;

    const meName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        "Unknown";

    const meAvatar = user?.user_metadata?.avatar_url ?? "";

    async function signInWithGoogle() {
        const redirectTo =
            window.location.hostname === "localhost"
                ? "http://localhost:8888"
                : window.location.origin;

        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo },
        });
    }

    async function signOut() {
        await supabase.auth.signOut();
    }

    return {
        session,
        user,
        userId,
        meName,
        meAvatar,
        loading,
        signInWithGoogle,
        signOut,
    };
}
