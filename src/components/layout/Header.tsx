import { useLocation } from "react-router-dom";
import AuthButtons from "../../features/auth/AuthButtons";

type HeaderProps = {
    loading: boolean;
    user: any;
    displayName: string;
    meName: string;
    isAdmin: boolean;
    onSignOut: () => void;
    onSignIn: () => void;
};

export default function Header({
    loading,
    user,
    displayName,
    meName,
    isAdmin,
    onSignOut,
    onSignIn,
}: HeaderProps) {
    const location = useLocation();

    // Default text for home/tracks
    let description = "곰삔에 대해 소소하게 한마디 남기기 🐻";

    if (location.pathname === "/wiki") {
        description = "곰삔에 대해서 소소하게 알아가 보기 🐻";
    } else if (location.pathname === "/profile") {
        description = "프로필 수정";
    }

    return (
        <header
            style={{
                padding: "10px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "var(--bg-color)",
                borderBottom: "1px solid var(--border-color)",
                height: "80px",
                boxSizing: "border-box",
            }}
        >
            <div>
                <a href="/" style={{ textDecoration: "none", color: "inherit" }}>
                    <h1 style={{ margin: 0, fontSize: "1.5rem" }}>gombbin tracking</h1>
                </a>
                <p id="page-description" style={{ margin: "4px 0 0", color: "#888", fontSize: "0.9rem" }}>
                    {description}
                </p>
            </div>

            <AuthButtons
                loading={loading}
                user={user}
                displayName={displayName}
                meName={meName}
                isAdmin={isAdmin}
                onSignOut={onSignOut}
                onSignIn={onSignIn}
            />
        </header>
    );
}
