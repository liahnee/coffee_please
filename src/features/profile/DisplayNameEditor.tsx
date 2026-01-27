type DisplayNameEditorProps = {
    user: any;
    displayName: string;
    setDisplayName: (name: string) => void;
    saveDisplayName: () => void;
    savingName: boolean;
};

export default function DisplayNameEditor({
    user,
    displayName,
    setDisplayName,
    saveDisplayName,
    savingName,
}: DisplayNameEditorProps) {
    if (!user) return null;

    return (
        <section
            style={{
                marginTop: 16,
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 12,
            }}
        >
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700 }}>내 닉네임</span>
                <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={{ padding: 8, minWidth: 220 }}
                    placeholder="내 닉네임"
                    maxLength={30}
                />
                <button type="button" onClick={saveDisplayName} disabled={savingName}>
                    {savingName ? "Saving..." : "Save"}
                </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                닉네임은 새 댓글부터 적용돼. (저장 후 자동 반영)
            </div>
        </section>
    );
}
