import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export function useProfile(userId: string | null, meName: string) {
    const [displayName, setDisplayName] = useState<string>("");
    const [savingName, setSavingName] = useState(false);

    // Load nickname from profiles when logged in
    useEffect(() => {
        if (!userId) {
            setDisplayName("");
            return;
        }

        (async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("display_name")
                .eq("user_id", userId)
                .maybeSingle();

            if (error) {
                console.error(error);
                setDisplayName(meName);
                return;
            }

            if (data?.display_name) setDisplayName(data.display_name);
            else setDisplayName(meName);
        })();
    }, [userId, meName]);

    async function saveDisplayName() {
        if (!userId) return;

        const dn = displayName.trim().slice(0, 30);
        if (!dn) {
            alert("닉네임을 입력해줘!");
            return;
        }

        setSavingName(true);

        const { error } = await supabase.from("profiles").upsert({
            user_id: userId,
            display_name: dn,
            updated_at: new Date().toISOString(),
        });

        setSavingName(false);

        if (error) {
            alert(error.message);
            return;
        }

        return true; // Success signal
    }

    return { displayName, setDisplayName, saveDisplayName, savingName };
}
