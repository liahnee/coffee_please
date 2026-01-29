import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabaseClient";
import type { WikiSection, WikiEditMode } from "../../types/wiki";
import MarkdownEditor from "./MarkdownEditor";

type EditRequestModalProps = {
    mode: WikiEditMode;
    sectionId?: string; // For Edit
    parentSectionId?: string | null; // For Add

    // existing data
    sections: WikiSection[]; // For siblings / link autocomplete
    currentSection?: WikiSection; // For getting title/slug in edit mode

    onClose: () => void;
    onSubmitted: () => void;

    user: any; // Authenticated user
};

export default function EditRequestModal({
    mode,
    sectionId,
    parentSectionId,
    sections,
    currentSection,
    onClose,
    onSubmitted,
    user
}: EditRequestModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Fields
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("");
    const [baseVersionId, setBaseVersionId] = useState<string | null>(null);

    // Parent & Order Fields
    const [proposedParentId, setProposedParentId] = useState<string | null>(null);
    const [proposedOrderIndex, setProposedOrderIndex] = useState<number>(0);
    const [isOrderExpanded, setIsOrderExpanded] = useState(false);
    const orderPopoverRef = useRef<HTMLDivElement>(null);

    const [orderPlacement, setOrderPlacement] = useState<"down" | "up">("down");
    const [orderMaxHeight, setOrderMaxHeight] = useState<number>(280);

    const rightPanelRef = useRef<HTMLDivElement>(null);

    // Helper: Find all descendants to prevent cycles
    const getForbiddenIds = (currentId: string, allSections: WikiSection[]): string[] => {
        const forbidden = [currentId];
        const findChildren = (pid: string) => {
            allSections.filter(s => s.parent_id === pid).forEach(child => {
                forbidden.push(child.id);
                findChildren(child.id);
            });
        };
        findChildren(currentId);
        return forbidden;
    };

    const forbiddenIds = mode === 'edit' && sectionId ? getForbiddenIds(sectionId, sections) : [];

    useEffect(() => {
        // Initialization
        if (mode === "edit") {
            if (currentSection) {
                setTitle(currentSection.title);
                setSlug(currentSection.slug);
                setProposedParentId(currentSection.parent_id);
                setProposedOrderIndex(currentSection.order_index);

                // Fetch latest content
                (async () => {
                    setLoading(true);
                    const { data } = await supabase
                        .from('wiki_latest_versions')
                        .select('content, version_id')
                        .eq('section_id', currentSection.id)
                        .maybeSingle();

                    if (data) {
                        setContent(data.content);
                        setBaseVersionId((data as any).version_id);
                    }
                    setLoading(false);
                })();
            }
        } else {
            // Add Mode
            setTitle("");
            setSlug("");
            setContent("# New Section\n");
            setProposedParentId(parentSectionId || null);

            // Fetch current siblings to determine next order
            (async () => {
                let q = supabase.from('wiki_sections').select('order_index').eq('is_deleted', false);
                if (parentSectionId) q = q.eq('parent_id', parentSectionId);
                else q = q.is('parent_id', null);

                const { data } = await q.order('order_index', { ascending: false }).limit(1);
                setProposedOrderIndex((data && data.length > 0) ? data[0].order_index + 1 : 0);
            })();
        }
    }, [mode, currentSection, parentSectionId]);

    useEffect(() => {
        if (!isOrderExpanded) return;
        const wrap = orderPopoverRef.current;
        const panel = rightPanelRef.current;
        if (!wrap || !panel) return;

        const wrapRect = wrap.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();

        // popover가 panel 바깥으로 튀지 않게 panel 기준으로 계산
        const spaceBelow = panelRect.bottom - wrapRect.bottom;
        const spaceAbove = wrapRect.top - panelRect.top;

        const padding = 12;      // panel 안 여유
        const desired = 280;     // 기본 목표 높이
        const minH = 140;        // 너무 작아지지 않게

        // 아래 공간이 부족하면 위로, 아니면 아래로
        const shouldOpenUp = spaceBelow < 200 && spaceAbove > spaceBelow;

        setOrderPlacement(shouldOpenUp ? "up" : "down");

        const available = (shouldOpenUp ? spaceAbove : spaceBelow) - padding;
        setOrderMaxHeight(Math.max(minH, Math.min(desired, available)));
    }, [isOrderExpanded, proposedParentId, title, proposedOrderIndex]);


    // Derived siblings for ordering UI
    const siblings = sections
        .filter(s => s.parent_id === proposedParentId && s.id !== sectionId)
        .sort((a, b) => a.order_index - b.order_index);

    // Create a virtual list including the current being edited/added section
    const orderableItems = [...siblings];
    // We insert the current proposed section at the proposedOrderIndex position logically
    const insertionIndex = Math.min(proposedOrderIndex, orderableItems.length);
    orderableItems.splice(insertionIndex, 0, {
        id: "PROPOSED_TEMP_ID",
        title: title || "(Untitled)",
        order_index: proposedOrderIndex,
        depth: 0, // not important for list
        slug: "",
        parent_id: proposedParentId,
        created_at: "",
        description: null,
        is_deleted: false
    } as WikiSection);

    const moveUp = () => {
        if (proposedOrderIndex > 0) setProposedOrderIndex(prev => prev - 1);
    };
    const moveDown = () => {
        if (proposedOrderIndex < orderableItems.length - 1) setProposedOrderIndex(prev => prev + 1);
    };

    // Auto-generate slug from title if empty (simple)
    const handleTitleChange = (val: string) => {
        setTitle(val);
        if (mode === 'add' && !slug) {
            setSlug(val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, ''));
        }
    };

    // Outside click & Escape key for order popover
    useEffect(() => {
        if (!isOrderExpanded) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (orderPopoverRef.current && !orderPopoverRef.current.contains(e.target as Node)) {
                setIsOrderExpanded(false);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOrderExpanded(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOrderExpanded]);

    const handleSubmit = async () => {
        if (mode !== 'delete' && (!title || !slug || !content)) {
            alert("All fields are required.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Check slug uniqueness (if changed or new)
            if (mode !== 'delete' && (mode === 'add' || (mode === 'edit' && slug !== currentSection?.slug))) {
                const { data } = await supabase
                    .from('wiki_sections')
                    .select('id')
                    .eq('slug', slug)
                    .eq('is_deleted', false)
                    .maybeSingle();
                if (data) {
                    throw new Error("Slug is already taken. Please choose another.");
                }
            }

            const payload: any = {
                request_type: mode === 'delete' ? 'delete_section' : (mode === 'edit' ? 'edit_section' : 'add_section'),
                status: 'pending',
                requested_by: user.id,
            };

            if (mode === 'delete') {
                payload.section_id = sectionId;
                payload.request_type = 'delete_section'
                payload.status = 'pending'
            } else {
                payload.proposed_title = title;
                payload.proposed_slug = slug;
                payload.proposed_content = content;
                payload.proposed_parent_id = proposedParentId;
                payload.proposed_order_index = proposedOrderIndex;

                if (mode === 'edit') {
                    payload.section_id = sectionId;
                    payload.base_version_id = baseVersionId;
                } else {
                    payload.parent_section_id = parentSectionId || null;
                }
            }

            const { error: insertError } = await supabase
                .from('wiki_edit_requests')
                .insert(payload);

            if (insertError) throw insertError;

            alert("Request submitted successfully!");
            onSubmitted();
            onClose();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="modal-overlay" style={overlayStyle}>
                <div style={modalStyle}>
                    <h3>Please Login</h3>
                    <p>You must be logged in to propose changes.</p>
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
        );
    }

    const isDelete = mode === 'delete';

    return (
        <div className="modal-overlay" style={overlayStyle}>
            <div style={{ ...modalStyle, maxWidth: 1100 }} className="editRequestModalRoot">
                <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>
                        {isDelete ? "Delete Section" : (mode === 'add' ? 'New Wiki Section' : 'Edit Wiki Section')}
                    </h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 28, cursor: "pointer", opacity: 0.6 }}>×</button>
                </header>

                {error && <div style={{ color: "red", backgroundColor: "rgba(255,0,0,0.1)", padding: 12, borderRadius: 4, marginBottom: 16 }}>{error}</div>}

                {isDelete ? (
                    <div style={{ padding: "20px 0", fontSize: 16 }}>
                        Are you sure you want to request the deletion of "<strong>{currentSection?.title}</strong>"?
                        <p style={{ marginTop: 12, color: "#888", fontSize: 14 }}>
                            This will create a request for an administrator to review.
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 340px",
                        gap: 24,
                        alignItems: "start"
                    }}>
                        {/* LEFT COLUMN: EDITOR */}
                        <div style={{ minWidth: 0 }}>
                            <label style={labelStyle}>
                                Content
                                <MarkdownEditor
                                    value={content}
                                    onChange={setContent}
                                    sections={sections}
                                />
                            </label>
                        </div>

                        {/* RIGHT COLUMN: METADATA */}
                        <div ref={rightPanelRef} style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 20,
                            position: "sticky",
                            top: 0
                        }}>
                            <label style={labelStyle}>
                                Title
                                <input
                                    value={title}
                                    onChange={e => handleTitleChange(e.target.value)}
                                    style={inputStyle}
                                    placeholder="Section Title"
                                />
                            </label>

                            <label style={labelStyle}>
                                Slug (URL Path)
                                <input
                                    value={slug}
                                    onChange={e => setSlug(e.target.value)}
                                    style={inputStyle}
                                    placeholder="section-slug"
                                />
                            </label>

                            <label style={labelStyle}>
                                Parent Section
                                <select
                                    value={proposedParentId || ""}
                                    onChange={e => {
                                        setProposedParentId(e.target.value || null);
                                        setProposedOrderIndex(0); // Reset order on parent change
                                    }}
                                    style={inputStyle}
                                >
                                    <option value="">(Root)</option>
                                    {sections
                                        .filter(s => !forbiddenIds.includes(s.id))
                                        .map(s => (
                                            <option key={s.id} value={s.id}>
                                                {"  ".repeat(s.depth)}{s.title}
                                            </option>
                                        ))
                                    }
                                </select>
                            </label>

                            <div style={{ ...labelStyle, position: "relative" }} ref={orderPopoverRef} className="orderFieldWrap">
                                Order Position
                                <div
                                    onClick={() => setIsOrderExpanded(!isOrderExpanded)}
                                    style={{
                                        border: "1px solid var(--border-color)",
                                        borderRadius: 8,
                                        backgroundColor: "var(--bg-secondary)",
                                        cursor: "pointer",
                                        padding: "10px 14px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginTop: 6
                                    }}
                                >
                                    <span style={{ fontWeight: 600, color: "var(--accent-color, #646cff)" }}>
                                        {title || "(Untitled)"}
                                    </span>
                                    {/* <span style={{ fontSize: 11, opacity: 0.5 }}>{isOrderExpanded ? "Open" : "Click to reorder"}</span> */}
                                </div>

                                {isOrderExpanded && (
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="orderPopover"
                                        style={{
                                            position: "absolute",
                                            ...(orderPlacement === "down"
                                                ? { top: "calc(100% + 8px)" }
                                                : { bottom: "calc(100% + 8px)" }),
                                            left: 0,
                                            right: 0,
                                            width: "auto",
                                            maxHeight: orderMaxHeight,
                                            overflowY: "auto",
                                            backgroundColor: "var(--bg-secondary)",
                                            border: "1px solid var(--border-color)",
                                            borderRadius: 12,
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                                            zIndex: 2000,
                                            display: "flex",
                                            flexDirection: "column"
                                        }}
                                    >
                                        <div style={{
                                            padding: "12px 14px",
                                            borderBottom: "1px solid var(--border-color)",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            position: "sticky",
                                            top: 0,
                                            backgroundColor: "var(--bg-secondary)",
                                            zIndex: 1
                                        }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.6 }}>
                                                Reorder within this parent
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsOrderExpanded(false); }}
                                                style={{
                                                    background: "var(--accent-color, #646cff)",
                                                    color: "white",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    fontSize: 10,
                                                    fontWeight: "bold",
                                                    padding: "5px 10px",
                                                    borderRadius: 6
                                                }}
                                            >
                                                Done
                                            </button>
                                        </div>
                                        <div style={{ padding: "6px 0" }}>
                                            {orderableItems.map((item, idx) => {
                                                const isTarget = item.id === "PROPOSED_TEMP_ID";
                                                return (
                                                    <div key={item.id} style={{
                                                        padding: "10px 14px",
                                                        fontSize: 13,
                                                        backgroundColor: isTarget ? "rgba(100, 108, 255, 0.12)" : "transparent",
                                                        borderLeft: isTarget ? "4px solid var(--accent-color, #646cff)" : "4px solid transparent",
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center"
                                                    }}>
                                                        <span style={{
                                                            fontWeight: isTarget ? 600 : 400,
                                                            color: isTarget ? "var(--accent-color, #646cff)" : "inherit"
                                                        }}>
                                                            {idx + 1}. {item.title}
                                                        </span>
                                                        {isTarget && (
                                                            <div style={{ display: "flex", gap: 8 }}>
                                                                <button onClick={(e) => { e.stopPropagation(); moveUp(); }} disabled={idx === 0} style={arrowButtonStyle}>↑</button>
                                                                <button onClick={(e) => { e.stopPropagation(); moveDown(); }} disabled={idx === orderableItems.length - 1} style={arrowButtonStyle}>↓</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <footer style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 20, borderTop: "1px solid var(--border-color)" }}>
                    <button onClick={onClose} style={{ background: "none", border: "1px solid #ccc", padding: "10px 20px", borderRadius: 6, fontWeight: 500 }}>
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{ background: isDelete ? "#ff4d4f" : "var(--accent-color, #646cff)", color: "white", border: "none", padding: "10px 24px", borderRadius: 6, fontWeight: 600 }}
                    >
                        {loading ? "Submitting..." : (isDelete ? "Submit Delete Request" : "Submit Request")}
                    </button>
                </footer>
            </div>
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)"
};

const modalStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-color)",
    color: "var(--text-color)",
    padding: "32px",
    borderRadius: 12,
    width: "95%",
    maxWidth: 800,
    maxHeight: "95vh",
    overflowY: "auto",
    boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
    zIndex: 1001,
    position: "relative"
};

const inputStyle: React.CSSProperties = {
    display: "block", width: "100%", padding: 8, marginTop: 4,
    backgroundColor: "var(--bg-color)", color: "var(--text-color)",
    border: "1px solid var(--border-color)", borderRadius: 4
};

const labelStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: "bold"
};

const arrowButtonStyle: React.CSSProperties = {
    padding: "2px 6px",
    fontSize: 12,
    cursor: "pointer",
    background: "var(--bg-color)",
    border: "1px solid var(--border-color)",
    borderRadius: 3,
    color: "var(--text-color)"
};
