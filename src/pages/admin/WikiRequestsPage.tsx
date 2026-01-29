import { useState, useEffect, useMemo } from "react";
import { useAdminRequests } from "../../hooks/useAdminRequests";
import type { RequestDetailData } from "../../hooks/useAdminRequests";
import type { WikiEditRequest } from "../../types/wiki";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../hooks/useAuth";
import { diffLines } from "diff";
import type { Change } from "diff";

type DiffMode = "prop_v_latest" | "prop_v_base" | "base_v_latest" | "raw";

function SimpleDiff({ oldText, newText }: { oldText: string; newText: string }) {
    const changes = useMemo(() => diffLines(oldText || "", newText || ""), [oldText, newText]);

    return (
        <div style={{
            fontFamily: "monospace",
            fontSize: 12,
            whiteSpace: "pre-wrap",
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 4,
            overflow: "hidden"
        }}>
            {changes.map((change: Change, i: number) => {
                const backgroundColor = change.added ? "rgba(0, 255, 0, 0.1)" : change.removed ? "rgba(255, 0, 0, 0.1)" : "transparent";
                const color = change.added ? "#2e7d32" : change.removed ? "#d32f2f" : "inherit";
                const prefix = change.added ? "+ " : change.removed ? "- " : "  ";

                return (
                    <div key={i} style={{ backgroundColor, color, padding: "0 8px", display: "flex" }}>
                        <span style={{ userSelect: "none", opacity: 0.5, marginRight: 8, width: 14 }}>{prefix}</span>
                        <span>{change.value}</span>
                    </div>
                );
            })}
        </div>
    );
}

export default function WikiRequestsPage() {
    const { user } = useAuth();
    const { groups, loading, error, fetchRequestDetail, refresh } = useAdminRequests();
    const [selectedRequest, setSelectedRequest] = useState<WikiEditRequest | null>(null);
    const [detailData, setDetailData] = useState<RequestDetailData | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [diffMode, setDiffMode] = useState<DiffMode>("prop_v_latest");

    // Accordion state
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    useEffect(() => {
        if (selectedRequest) {
            setDetailLoading(true);
            setDiffMode("prop_v_latest"); // Reset mode on new selection
            fetchRequestDetail(selectedRequest).then(data => {
                setDetailData(data);
                setDetailLoading(false);
            });
        } else {
            setDetailData(null);
        }
    }, [selectedRequest, fetchRequestDetail]);

    const handleReject = async () => {
        if (!selectedRequest || !user) return;
        if (!confirm("Are you sure you want to REJECT this request?")) return;

        try {
            const { error } = await supabase.from("wiki_edit_requests").update({
                status: "rejected",
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString()
            }).eq("id", selectedRequest.id);

            if (error) throw error;

            alert("Request rejected.");
            setSelectedRequest(null);
            refresh();
        } catch (err: any) {
            alert("Error rejecting: " + err.message);
        }
    };

    const handleApprove = async () => {
        if (!selectedRequest || !user) return;
        if (!confirm("Are you sure you want to APPROVE this request? Changes will be published immediately.")) return;

        try {
            if (selectedRequest.request_type === 'edit_section') {
                // 1. Update section metadata
                const { error: secError } = await supabase.from("wiki_sections").update({
                    title: selectedRequest.proposed_title,
                    slug: selectedRequest.proposed_slug,
                    parent_id: selectedRequest.proposed_parent_id,
                    order_index: selectedRequest.proposed_order_index ?? 0
                }).eq("id", selectedRequest.section_id);

                if (secError) throw secError;

                // 2. Insert new version
                const { error: verError } = await supabase.from("wiki_section_versions").insert({
                    section_id: selectedRequest.section_id,
                    content: selectedRequest.proposed_content,
                    created_by: user.id,
                    source_request_id: selectedRequest.id
                });

                if (verError) throw verError;

            } else if (selectedRequest.request_type === 'delete_section') {
                // Delete Section using RPC for recursive soft delete
                const { error: rpcError } = await supabase.rpc('soft_delete_section_tree', {
                    p_section_id: selectedRequest.section_id
                });

                if (rpcError) throw rpcError;
            } else {
                // Add Section
                // 1. Insert new section
                const { data: newSection, error: secError } = await supabase.from("wiki_sections").insert({
                    title: selectedRequest.proposed_title,
                    slug: selectedRequest.proposed_slug,
                    parent_id: selectedRequest.proposed_parent_id,
                    order_index: selectedRequest.proposed_order_index ?? 0
                }).select().single();

                if (secError) throw secError;

                // 2. Insert first version
                const { error: verError } = await supabase.from("wiki_section_versions").insert({
                    section_id: newSection.id,
                    content: selectedRequest.proposed_content,
                    created_by: user.id,
                    source_request_id: selectedRequest.id
                });

                if (verError) throw verError;
            }

            // 3. Mark request approved
            const { error: reqError } = await supabase.from("wiki_edit_requests").update({
                status: "approved",
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString()
            }).eq("id", selectedRequest.id);

            if (reqError) throw reqError;

            alert("Request approved and published.");
            setSelectedRequest(null);
            refresh();

        } catch (err: any) {
            console.error(err);
            alert("Error approving: " + err.message);
        }
    };

    const isBaseOutdated = detailData?.latestVersion && selectedRequest?.base_version_id &&
        detailData.latestVersion.version_id !== selectedRequest.base_version_id;

    if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading requests...</div>;
    if (error) return <div style={{ padding: 40, color: "red" }}>Error: {error}</div>;

    return (
        <div style={{ display: "flex", height: "calc(100vh - 120px)" }}>
            {/* Left Pane: Request List */}
            <div style={{ width: "30%", minWidth: 250, borderRight: "1px solid var(--border-color)", overflowY: "auto", backgroundColor: "var(--bg-color)" }}>
                <div style={{ padding: 16, borderBottom: "1px solid var(--border-color)" }}>
                    <h2 style={{ fontSize: 18, margin: 0 }}>Requests</h2>
                </div>

                {groups.length === 0 ? (
                    <div style={{ padding: 20, color: "#888", textAlign: "center" }}>
                        No pending requests.
                    </div>
                ) : (
                    <div>
                        {groups.map(group => (
                            <div key={group.sectionId} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                <button
                                    onClick={() => toggleGroup(group.sectionId)}
                                    style={{
                                        width: "100%", textAlign: "left", padding: "12px 16px",
                                        background: "var(--bg-secondary)", border: "none", cursor: "pointer",
                                        fontWeight: "bold", display: "flex", justifyContent: "space-between"
                                    }}
                                >
                                    <span>{group.sectionTitle}</span>
                                    <span>{group.requests.length}</span>
                                </button>

                                {(expandedGroups[group.sectionId] === undefined ? true : expandedGroups[group.sectionId]) && (
                                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                        {group.requests.map(req => (
                                            <li key={req.id}>
                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    style={{
                                                        width: "100%", textAlign: "left", padding: "12px 16px",
                                                        border: "none", borderLeft: selectedRequest?.id === req.id ? "4px solid #646cff" : "4px solid transparent",
                                                        background: selectedRequest?.id === req.id ? "var(--bg-hover)" : "transparent",
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    <div style={{ display: "flex", gap: 8, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                                        <span style={{
                                                            color: req.request_type === 'add_section' ? "green" : (req.request_type === 'delete_section' ? "red" : "blue"),
                                                            textTransform: "uppercase"
                                                        }}>
                                                            {req.request_type === 'add_section' ? 'ADD' : (req.request_type === 'delete_section' ? 'DELETE' : 'EDIT')}
                                                        </span>
                                                        <span style={{ color: "#888" }}>
                                                            {new Date(req.requested_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: 14 }}>
                                                        {req.proposed_title || group.sectionTitle}
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Pane: Detail View */}
            <div style={{ flex: 1, padding: 0, overflowY: "auto", backgroundColor: "var(--bg-color)" }}>
                {selectedRequest ? (
                    detailLoading ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading details...</div>
                    ) : (
                        <div style={{ padding: 30 }}>
                            <header style={{ marginBottom: 20, borderBottom: "1px solid var(--border-color)", paddingBottom: 20 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                    <div>
                                        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                                            <span style={{
                                                background: selectedRequest.request_type === 'add_section' ? "#e6fffa" : (selectedRequest.request_type === 'delete_section' ? "#fff5f5" : "#ebf8ff"),
                                                color: selectedRequest.request_type === 'add_section' ? "#285e61" : (selectedRequest.request_type === 'delete_section' ? "#c53030" : "#2b6cb0"),
                                                padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: "bold"
                                            }}>
                                                {selectedRequest.request_type === 'add_section' ? 'ADD SECTION' : (selectedRequest.request_type === 'delete_section' ? 'DELETE SECTION' : 'EDIT SECTION')}
                                            </span>
                                            {isBaseOutdated && (
                                                <span style={{ background: "#fff5f5", color: "#c53030", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: "bold", border: "1px solid #feb2b2" }}>
                                                    ⚠️ Base version is outdated
                                                </span>
                                            )}
                                            <span style={{ color: "#888", fontSize: 13 }}>ID: {selectedRequest.id}</span>
                                        </div>
                                        <h1 style={{ margin: 0, fontSize: 24 }}>{selectedRequest.proposed_title || detailData?.currentSection?.title || "Section Delete Hub"}</h1>
                                        <div style={{ marginTop: 8, color: "#666", fontSize: 14 }}>
                                            {selectedRequest.request_type === 'delete_section' ? (
                                                <>Section Title: <strong>{detailData?.currentSection?.title}</strong></>
                                            ) : (
                                                <>Proposed Slug: <code>{selectedRequest.proposed_slug}</code></>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <button
                                            onClick={handleReject}
                                            style={{
                                                padding: "8px 16px", borderRadius: 4,
                                                border: "1px solid #ff4444", color: "#ff4444", background: "white", cursor: "pointer", fontWeight: "bold"
                                            }}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={handleApprove}
                                            style={{
                                                padding: "8px 16px", borderRadius: 4,
                                                border: "none", color: "white", background: "#646cff", cursor: "pointer", fontWeight: "bold"
                                            }}
                                        >
                                            Approve & Publish
                                        </button>
                                    </div>
                                </div>
                            </header>

                            {/* Tabs for comparison */}
                            <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
                                <button
                                    onClick={() => setDiffMode("prop_v_latest")}
                                    style={{
                                        padding: "6px 12px", borderRadius: 4, cursor: "pointer", border: "none",
                                        background: diffMode === "prop_v_latest" ? "#646cff" : "none",
                                        color: diffMode === "prop_v_latest" ? "white" : "inherit",
                                        fontWeight: diffMode === "prop_v_latest" ? "bold" : "normal"
                                    }}
                                >
                                    Proposed vs Latest
                                </button>
                                {detailData?.baseVersion && (
                                    <button
                                        onClick={() => setDiffMode("prop_v_base")}
                                        style={{
                                            padding: "6px 12px", borderRadius: 4, cursor: "pointer", border: "none",
                                            background: diffMode === "prop_v_base" ? "#646cff" : "none",
                                            color: diffMode === "prop_v_base" ? "white" : "inherit",
                                            fontWeight: diffMode === "prop_v_base" ? "bold" : "normal"
                                        }}
                                    >
                                        Proposed vs Base Snapshot
                                    </button>
                                )}
                                {detailData?.baseVersion && isBaseOutdated && (
                                    <button
                                        onClick={() => setDiffMode("base_v_latest")}
                                        style={{
                                            padding: "6px 12px", borderRadius: 4, cursor: "pointer", border: "none",
                                            background: diffMode === "base_v_latest" ? "#646cff" : "none",
                                            color: diffMode === "base_v_latest" ? "white" : "inherit",
                                            fontWeight: diffMode === "base_v_latest" ? "bold" : "normal"
                                        }}
                                    >
                                        Base vs Latest (Conflicts?)
                                    </button>
                                )}
                                <button
                                    onClick={() => setDiffMode("raw")}
                                    style={{
                                        padding: "6px 12px", borderRadius: 4, cursor: "pointer", border: "none",
                                        background: diffMode === "raw" ? "#646cff" : "none",
                                        color: diffMode === "raw" ? "white" : "inherit",
                                        fontWeight: diffMode === "raw" ? "bold" : "normal"
                                    }}
                                >
                                    Raw Content
                                </button>
                            </div>

                            {/* Comparison View */}
                            <div style={{ marginBottom: 40 }}>
                                {diffMode === "prop_v_latest" && (
                                    <>
                                        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Comparing Proposed vs Latest Version</h3>
                                        <SimpleDiff oldText={detailData?.latestVersion?.content || ""} newText={selectedRequest.proposed_content || ""} />
                                    </>
                                )}
                                {diffMode === "prop_v_base" && (
                                    <>
                                        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Comparing Proposed vs Original Base Snapshot</h3>
                                        <SimpleDiff oldText={detailData?.baseVersion?.content || ""} newText={selectedRequest.proposed_content || ""} />
                                    </>
                                )}
                                {diffMode === "base_v_latest" && (
                                    <>
                                        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Comparing Original Base Snapshot vs Current Latest</h3>
                                        <SimpleDiff oldText={detailData?.baseVersion?.content || ""} newText={detailData?.latestVersion?.content || ""} />
                                    </>
                                )}
                                {diffMode === "raw" && (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                        <div>
                                            <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#666" }}>Latest Content</h4>
                                            <pre style={{ padding: 12, background: "var(--bg-secondary)", borderRadius: 4, fontSize: 12, whiteSpace: "pre-wrap", border: "1px solid var(--border-color)", maxHeight: 500, overflowY: "auto" }}>
                                                {detailData?.latestVersion?.content || "(New Section)"}
                                            </pre>
                                        </div>
                                        <div>
                                            <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#666" }}>Proposed Content</h4>
                                            <pre style={{ padding: 12, background: "var(--bg-secondary)", borderRadius: 4, fontSize: 12, whiteSpace: "pre-wrap", border: "1px solid var(--border-color)", maxHeight: 500, overflowY: "auto" }}>
                                                {selectedRequest.proposed_content || (selectedRequest.request_type === 'delete_section' ? "(Section requested for deletion)" : "(No proposed content)")}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                ) : (
                    <div style={{ padding: 40, color: "#888", textAlign: "center", fontStyle: "italic" }}>
                        Select a request from the list to view details
                    </div>
                )}
            </div>
        </div>
    );
}
