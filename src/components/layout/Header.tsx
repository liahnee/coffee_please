import { useLocation } from "react-router-dom";
import AuthButtons from "../../features/auth/AuthButtons";

type HeaderProps = {
    loading: boolean;
    user: any;
    displayName: string;
    meName: string;
    onSignOut: () => void;
    onSignIn: () => void;
};

export default function Header({
    loading,
    user,
    displayName,
    meName,
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
        <header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
                <a href="/" style={{ textDecoration: "none", color: "inherit" }}>
                    <h1 style={{ margin: 0 }}>gombbin tracking</h1>
                </a>
                <p id="page-description" style={{ margin: "6px 0 0", color: "#555" }}>
                    {description}
                </p>
            </div>

            <AuthButtons
                loading={loading}
                user={user}
                displayName={displayName}
                meName={meName}
                onSignOut={onSignOut}
                onSignIn={onSignIn}
            />
        </header>
    );
}
