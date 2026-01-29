
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../supabaseClient";

export default function AdminRoute() {
    const { user, loading: authLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [checkingAdmin, setCheckingAdmin] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setCheckingAdmin(false);
            return;
        }

        (async () => {
            setCheckingAdmin(true);
            const { data, error } = await supabase
                .from("profiles")
                .select("is_admin")
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) {
                console.error("Error checking admin status:", error);
                setIsAdmin(false);
            } else {
                setIsAdmin(data?.is_admin || false);
            }
            setCheckingAdmin(false);
        })();
    }, [user, authLoading]);

    if (authLoading || checkingAdmin) {
        return <div style={{ padding: 40, textAlign: "center" }}>Checking permissions...</div>;
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (!isAdmin) {
        return (
            <div style={{ padding: 40, textAlign: "center", color: "red" }}>
                <h2>403 Forbidden</h2>
                <p>You do not have permission to access this page.</p>
            </div>
        );
    }

    return <Outlet />;
}
