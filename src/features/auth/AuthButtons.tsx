import { useState } from "react";
import { useTheme } from "../../hooks/useTheme";

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
    const [isOpen, setIsOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    if (loading) return null;

    if (user) {
        return (
            <div style={{ position: "relative", display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        background: "none",
                        border: "none",
                        padding: 10,
                        cursor: "pointer",
                        fontSize: "inherit",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                    }}
                >
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
                    <span style={{ fontSize: 10 }}>▼</span>
                </button>

                {isOpen && (
                    <div
                        style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            marginTop: 0,
                            backgroundColor: "var(--bg-color)",
                            border: "1px solid var(--border-color)",
                            color: "var(--text-color)",
                            borderRadius: 8,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            padding: 4,
                            zIndex: 100,
                            minWidth: 120,
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                window.location.href = "/profile";
                            }}
                            style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "8px 12px",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 14,
                                color: "var(--text-color)",
                            }}
                        >
                            Profile
                        </button>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "8px 12px",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 14,
                                color: "var(--text-color)",
                                borderTop: "1px solid var(--border-color)",
                            }}
                        >
                            {theme === "light" ? "Dark" : "Light"} Mode
                        </button>
                        <button
                            type="button"
                            onClick={onSignOut}
                            style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "8px 12px",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 14,
                                color: "#d32f2f",
                            }}
                        >
                            Sign out
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <button type="button" onClick={onSignIn}>
            Sign in with Google
        </button>
    );
}
