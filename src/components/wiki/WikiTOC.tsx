import { useState } from "react";
import type { WikiSection, TocNode } from "../../types/wiki";
import { useTheme } from "../../hooks/useTheme";

type WikiTOCProps = {
    nodes: TocNode[];
    selectedSlug: string | null;
    onSelect: (slug: string) => void;
    onAddSection: (parentId: string | null) => void;
    onEditSection: (section: WikiSection) => void;
    onViewAll: () => void;
    mobileDrawerOpen: boolean;
    onCloseDrawer: () => void;
};

export default function WikiTOC({
    nodes,
    selectedSlug,
    onSelect,
    onAddSection,
    onEditSection,
    onViewAll,
    mobileDrawerOpen,
    onCloseDrawer,
}: WikiTOCProps) {
    const { theme } = useTheme();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
    };

    const isExpanded = (id: string) => expanded[id] !== false; // Default expanded

    const renderNode = (node: TocNode, depth: number) => {
        const hasChildren = node.children && node.children.length > 0;
        const expandedState = isExpanded(node.id);
        const isSelected = selectedSlug === node.slug;
        const isRoot = depth === 0;

        return (
            <li key={node.id} style={{ display: "flex", flexDirection: "column" }}>
                <div
                    className="toc-item"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        background: isSelected
                            ? (theme === "dark" ? "#333" : "#f0f0f0")
                            : "transparent",
                        borderLeft: isSelected ? "3px solid #646cff" : "3px solid transparent",
                        padding: "4px 8px 4px 4px",
                        paddingLeft: 4 + depth * 12,
                        position: "relative",
                        textAlign: "left"
                    }}
                    onClick={() => {
                        onSelect(node.slug);
                        onCloseDrawer();
                    }}
                >
                    {/* Chevron */}
                    <div
                        onClick={(e) => toggleExpand(node.id, e)}
                        style={{
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            visibility: hasChildren ? "visible" : "hidden",
                            cursor: "pointer",
                            fontSize: 10,
                            opacity: 0.6
                        }}
                    >
                        {expandedState ? "▼" : "▶"}
                    </div>

                    {/* Title */}
                    <span style={{
                        flex: 1,
                        fontSize: isRoot ? 15 : 14,
                        fontWeight: isRoot ? 600 : (isSelected ? 600 : 400),
                        color: isSelected ? (theme === "dark" ? "#fff" : "#000") : "inherit",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textAlign: "left"
                    }}>
                        {node.title}
                    </span>

                    {/* Hover actions */}
                    <div className="hover-actions" style={{ display: "flex", gap: 4, visibility: "hidden" }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEditSection(node.data); }}
                            title="Propose Edit"
                            style={{ background: "none", border: "none", padding: 2, cursor: "pointer", fontSize: 12 }}
                        >
                            ✏️
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddSection(node.id); }}
                            title="Propose Child"
                            style={{ background: "none", border: "none", padding: 2, cursor: "pointer", fontSize: 14 }}
                        >
                            +
                        </button>
                    </div>

                    <style>{`
                        .toc-item:hover .hover-actions { visibility: visible !important; }
                        .toc-item:hover { background: var(--bg-hover) !important; }
                    `}</style>
                </div>

                {hasChildren && expandedState && (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </ul>
                )}
            </li>
        );
    };

    const tocContent = (
        <div style={{ padding: "16px 0" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 12px 16px 12px", borderBottom: "1px solid var(--border-color)" }}>
                <h3
                    style={{ fontSize: 16, margin: 0, cursor: "pointer", color: "var(--text-color)" }}
                    onClick={onViewAll}
                    onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                    Table of Contents
                </h3>
                <button
                    onClick={() => onAddSection(null)}
                    style={{
                        width: "100%",
                        background: "none",
                        border: "1px solid var(--border-color)",
                        borderRadius: 4,
                        padding: "6px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: "var(--text-color)",
                        fontWeight: 500
                    }}
                >
                    + New Root Section
                </button>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, marginTop: 8 }}>
                {nodes.map(node => renderNode(node, 0))}
            </ul>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                style={{
                    width: 260,
                    flexShrink: 0,
                    borderRight: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-secondary)",
                    overflowY: "auto",
                    height: "100%"
                }}
                className="toc-desktop"
            >
                {tocContent}
            </aside>

            {/* Mobile Drawer */}
            {mobileDrawerOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        zIndex: 1000,
                    }}
                    onClick={onCloseDrawer}
                >
                    <div
                        style={{
                            width: "80%",
                            maxWidth: 300,
                            height: "100%",
                            backgroundColor: "var(--bg-color)",
                            color: "var(--text-color)",
                            overflowY: "auto",
                            boxShadow: "2px 0 8px rgba(0,0,0,0.2)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {tocContent}
                    </div>
                </div>
            )}
        </>
    );
}
