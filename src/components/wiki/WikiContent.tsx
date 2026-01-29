import Markdown from "react-markdown";

type WikiContentProps = {
    title: string;
    markdown: string | null;
    updatedAt: string | null;
    onEdit?: () => void;
    onDelete?: () => void;
    sectionSlug?: string;
    depth?: number;
};

export default function WikiContent({ title, markdown, updatedAt, onEdit, onDelete, sectionSlug, depth = 0 }: WikiContentProps) {
    const isRoot = depth === 0;
    const headerId = sectionSlug ? `section-${sectionSlug}` : undefined;

    return (
        <div
            id={headerId}
            className="wiki-content-section"
            style={{
                padding: "24px 0",
                borderBottom: "1px solid var(--border-color)",
                scrollMarginTop: 20
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: isRoot ? 28 : (24 - depth * 2),
                        color: "var(--text-color)",
                        fontWeight: isRoot ? 800 : 700
                    }}>
                        {title}
                    </h2>

                    {/* Section Action Icons */}
                    <div style={{ display: "flex", gap: 12, marginLeft: 20, opacity: 0.4 }}>
                        {onEdit && (
                            <button
                                onClick={onEdit}
                                title="Edit section"
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "12px",
                                    padding: "2px",
                                    cursor: "pointer",
                                    filter: "grayscale(1)"
                                }}
                            >
                                ✏️
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={onDelete}
                                title="Delete section"
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "12px",
                                    padding: "2px",
                                    cursor: "pointer",
                                    filter: "grayscale(1)"
                                }}
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>

                {updatedAt && isRoot && (
                    <span style={{ fontSize: 11, color: "#888", opacity: 0.7 }}>
                        Updated: {new Date(updatedAt).toLocaleDateString()}
                    </span>
                )}
            </div>

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
