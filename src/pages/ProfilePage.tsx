import DisplayNameEditor from "../features/profile/DisplayNameEditor";

type ProfilePageProps = {
    user: any;
    displayName: string;
    saveDisplayName: (name: string) => Promise<boolean | undefined>;
    savingName: boolean;
};

export default function ProfilePage({
    user,
    displayName,
    saveDisplayName,
    savingName,
}: ProfilePageProps) {
    return (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 0" }}>
            <h2 style={{ fontSize: 20, marginBottom: 20 }}>My Profile</h2>
            <DisplayNameEditor
                user={user}
                displayName={displayName}
                saveDisplayName={saveDisplayName}
                savingName={savingName}
            />
        </div>
    );
}
