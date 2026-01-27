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
    return (
        <header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
                <h1 style={{ margin: 0 }}>gombbin tracking</h1>
                <p style={{ margin: "6px 0 0", color: "#555" }}>
                    곰삔에 대해 소소하게 한마디 남기기 🐻
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
