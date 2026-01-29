import { useState, useEffect } from "react";

type DisplayNameEditorProps = {
    user: any;
    displayName: string;
    saveDisplayName: (name: string) => void;
    savingName: boolean;
};

export default function DisplayNameEditor({
    user,
    displayName,
    saveDisplayName,
    savingName,
}: DisplayNameEditorProps) {
    const [inputValue, setInputValue] = useState(displayName);

    useEffect(() => {
        setInputValue(displayName);
    }, [displayName]);

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
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !savingName) {
                            saveDisplayName(inputValue);
                        }
                    }}
                    style={{ padding: 8, minWidth: 220, color: "#000", backgroundColor: "#fff" }}
                    placeholder="내 닉네임"
                    maxLength={30}
                />
                <button type="button" onClick={() => saveDisplayName(inputValue)} disabled={savingName}>
                    {savingName ? "Saving..." : "Save"}
                </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                닉네임은 새 댓글부터 적용돼. (저장 후 자동 반영)
            </div>
        </section>
    );
}
