import Markdown from "react-markdown";

type WikiContentProps = {
    title: string;
    markdown: string | null;
    updatedAt: string | null;
    onEdit?: () => void;
    onDelete?: () => void;
};

export default function WikiContent({ title, markdown, updatedAt, onEdit, onDelete }: WikiContentProps) {
    return (
        <div className="wiki-content" style={{ padding: "16px 24px", flex: 1 }}>
            <header style={{ marginBottom: 24, borderBottom: "1px solid var(--border-color)", paddingBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <h1 style={{ margin: "0 0 8px 0", fontSize: 28 }}>{title}</h1>
                    <div style={{ display: "flex", gap: 8 }}>
                        {onEdit && (
                            <button
                                onClick={onEdit}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "6px 12px",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    background: "none", border: "1px solid var(--border-color)", borderRadius: 4, cursor: "pointer", color: "var(--text-color)"
                                }}
                            >
                                <span style={{ fontSize: 14 }}>✏️</span> Edit
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={onDelete}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "6px 12px",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: "#c53030",
                                    borderColor: "#feb2b2",
                                    background: "none", border: "1px solid", borderRadius: 4, cursor: "pointer"
                                }}
                            >
                                <span style={{ fontSize: 14 }}>🗑️</span> Delete
                            </button>
                        )}
                    </div>
                </div>
                {updatedAt && (
                    <div style={{ fontSize: 13, color: "#888" }}>
                        마지막 업데이트: {new Date(updatedAt).toLocaleString()}
                    </div>
                )}
            </header>

            {markdown ? (
                <div style={{ lineHeight: 1.6 }}>
                    <Markdown
                        components={{
                            img: (props) => (
                                <img
                                    {...props}
                                    style={{ maxWidth: "100%", height: "auto", display: "block", margin: "16px 0", borderRadius: 8 }}
                                />
                            ),
                            a: (props) => <a {...props} style={{ color: "#646cff", textDecoration: "underline" }} />,
                            h1: (props) => <h2 {...props} style={{ fontSize: "1.8em", marginTop: "1.5em", marginBottom: "0.5em" }} />,
                            h2: (props) => <h3 {...props} style={{ fontSize: "1.5em", marginTop: "1.4em", marginBottom: "0.5em" }} />,
                            p: (props) => <p {...props} style={{ marginBottom: "1em" }} />,
                            ul: (props) => <ul {...props} style={{ paddingLeft: "1.5em", marginBottom: "1em" }} />,
                            ol: (props) => <ol {...props} style={{ paddingLeft: "1.5em", marginBottom: "1em" }} />,
                        }}
                    >
                        {markdown}
                    </Markdown>
                </div>
            ) : (
                <div style={{ color: "#666", fontStyle: "italic", padding: "40px 0", textAlign: "center" }}>
                    아직 내용이 없어요
                </div>
            )}
        </div>
    );
}
