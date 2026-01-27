

type AuthButtonsProps = {
    loading: boolean;
    user: any; // Using any for simplicity as it comes from Supabase session user
    displayName: string;
    meName: string;
    onSignOut: () => void;
    onSignIn: () => void;
};

export default function AuthButtons({
    loading,
    user,
    displayName,
    meName,
    onSignOut,
    onSignIn,
}: AuthButtonsProps) {
    if (loading) return null;

    if (user) {
        return (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span
                    style={{
                        maxWidth: 240,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {displayName || meName}
                </span>
                <button type="button" onClick={onSignOut}>
                    Sign out
                </button>
            </div>
        );
    }

    return (
        <button type="button" onClick={onSignIn}>
            Sign in with Google
        </button>
    );
}
