import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import type { WikiSection, WikiLatestVersion, WikiEditMode, TocNode } from "../types/wiki";
import WikiTOC from "../components/wiki/WikiTOC";
import WikiContent from "../components/wiki/WikiContent";
import EditRequestModal from "../components/wiki/EditRequestModal";
import { useAuth } from "../hooks/useAuth";
import { buildTocTree, flattenTocTree } from "../utils/wiki";

export default function WikiPage() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const slug = searchParams.get("slug");

    const [sections, setSections] = useState<WikiSection[]>([]);
    const [tocTree, setTocTree] = useState<TocNode[]>([]);
    const [loadingTOC, setLoadingTOC] = useState(true);
    const [content, setContent] = useState<WikiLatestVersion | null>(null);
    const [loadingContent, setLoadingContent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<WikiEditMode>("add");
    const [editTargetSectionId, setEditTargetSectionId] = useState<string | undefined>(undefined);
    const [addParentSectionId, setAddParentSectionId] = useState<string | null>(null);

    // 1. Fetch TOC on mount
    useEffect(() => {
        (async () => {
            setLoadingTOC(true);
            const { data, error } = await supabase
                .from("wiki_sections")
                .select("id, slug, title, description, parent_id, depth, order_index, created_at, is_deleted")
                .eq("is_deleted", false);

            if (error) {
                console.error("Error fetching sections:", error);
                setError("목차를 불러오는데 실패했습니다.");
            } else {
                const flatData = data as WikiSection[] || [];
                const tree = buildTocTree(flatData);
                const hierarchicalFlat = flattenTocTree(tree);
                setTocTree(tree);
                setSections(hierarchicalFlat);
            }
            setLoadingTOC(false);
        })();
    }, []);

    // 2. Handle slug selection
    useEffect(() => {
        if (loadingTOC || sections.length === 0) return;

        if (!slug) {
            const first = sections[0];
            setSearchParams({ slug: first.slug }, { replace: true });
            return;
        }

        if (slug === "_all") return; // Special mode

        const valid = sections.find(s => s.slug === slug);
        if (!valid) {
            const first = sections[0];
            setSearchParams({ slug: first.slug }, { replace: true });
        }
    }, [slug, loadingTOC, sections, setSearchParams]);

    // 3. Fetch Content
    useEffect(() => {
        if (!slug || sections.length === 0) return;

        (async () => {
            setLoadingContent(true);
            setContent(null);

            if (slug === "_all") {
                // Aggregate ALL sections in order
                const { data: allVersions, error } = await supabase
                    .from("wiki_latest_versions")
                    .select("section_id, content, created_at");

                if (error) {
                    console.error("Error fetching all content:", error);
                    setError("본문 전체를 불러오는데 실패했습니다.");
                } else {
                    const versionMap = new Map(allVersions.map(v => [v.section_id, v.content]));
                    // Aggregate based on 'sections' (which is already ordered hierarchical flat list)
                    const fullMarkdown = sections.map(s => {
                        const content = versionMap.get(s.id) || "*(No content)*";
                        const headerPrefix = "#".repeat(Math.min(s.depth + 1, 6));
                        return `${headerPrefix} ${s.title}\n\n${content}\n\n---\n`;
                    }).join("\n");

                    setContent({
                        section_id: "all",
                        content: fullMarkdown,
                        created_at: new Date().toISOString(),
                        created_by: "system",
                        source_request_id: null
                    });
                }
            } else {
                const section = sections.find((s) => s.slug === slug);
                if (!section) {
                    setLoadingContent(false);
                    return;
                }

                const { data, error } = await supabase
                    .from("wiki_latest_versions")
                    .select("section_id, content, created_at, created_by, source_request_id")
                    .eq("section_id", section.id)
                    .maybeSingle();

                if (error) {
                    console.error("Error fetching content:", error);
                    setError("본문을 불러오는데 실패했습니다.");
                } else {
                    setContent(data as WikiLatestVersion | null);
                }
            }
            setLoadingContent(false);
        })();
    }, [slug, sections]);

    const activeSection = sections.find((s) => s.slug === slug);

    const handleSelectSection = (newSlug: string) => {
        setSearchParams({ slug: newSlug });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleViewAll = () => {
        setSearchParams({ slug: "_all" });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Handlers for Modal
    const handleAddSection = (parentId: string | null) => {
        if (!user) {
            alert("Please login to propose changes.");
            return;
        }
        setModalMode("add");
        setAddParentSectionId(parentId);
        setEditTargetSectionId(undefined);
        setIsModalOpen(true);
    };

    const handleEditSection = () => {
        if (!user) {
            alert("Please login to propose changes.");
            return;
        }
        if (!activeSection) return;
        setModalMode("edit");
        setEditTargetSectionId(activeSection.id);
        setAddParentSectionId(null);
        setIsModalOpen(true);
    };

    const handleEditSpecificSection = (section: WikiSection) => {
        if (!user) {
            alert("Please login to propose changes.");
            return;
        }
        setModalMode("edit");
        setEditTargetSectionId(section.id);
        setAddParentSectionId(null);
        setIsModalOpen(true);
    };

    const handleDeleteSection = () => {
        if (!user) {
            alert("Please login to propose changes.");
            return;
        }
        if (!activeSection) return;
        setModalMode("delete");
        setEditTargetSectionId(activeSection.id);
        setAddParentSectionId(null);
        setIsModalOpen(true);
    };

    if (loadingTOC) {
        return <div style={{ padding: 40, textAlign: "center" }}>목차 로딩 중...</div>;
    }

    if (error && sections.length === 0) {
        return <div style={{ padding: 40, color: "red", textAlign: "center" }}>{error}</div>;
    }

    return (
        <div style={{ display: "flex", minHeight: "100%", position: "relative" }}>
            <div className="mobile-only" style={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
                <button
                    onClick={() => setMobileDrawerOpen(true)}
                    style={{ padding: "8px 12px", fontSize: 13 }}
                >
                    목차 보기
                </button>
            </div>

            <style>{`
         @media (max-width: 768px) {
           .toc-desktop { display: none !important; }
           .mobile-only { display: block !important; }
         }
         @media (min-width: 769px) {
           .mobile-only { display: none !important; }
         }
       `}</style>

            <WikiTOC
                nodes={tocTree}
                selectedSlug={slug}
                onSelect={handleSelectSection}
                onAddSection={handleAddSection}
                onEditSection={handleEditSpecificSection}
                onViewAll={handleViewAll}
                mobileDrawerOpen={mobileDrawerOpen}
                onCloseDrawer={() => setMobileDrawerOpen(false)}
            />

            <main style={{ flex: 1, minWidth: 0, paddingBottom: 60 }}>
                {loadingContent ? (
                    <div style={{ padding: 40, textAlign: "center", fontStyle: "italic", color: "#888" }}>
                        본문 로딩 중...
                    </div>
                ) : (
                    <WikiContent
                        title={slug === "_all" ? "Full Wiki Content" : (activeSection?.title || "Wiki")}
                        markdown={content?.content || null}
                        updatedAt={content?.created_at || null}
                        onEdit={slug === "_all" ? undefined : handleEditSection}
                        onDelete={slug === "_all" ? undefined : handleDeleteSection}
                    />
                )}
            </main>

            {isModalOpen && (
                <EditRequestModal
                    mode={modalMode}
                    sectionId={editTargetSectionId || undefined}
                    parentSectionId={addParentSectionId}
                    sections={sections}
                    currentSection={modalMode === 'edit' ? sections.find(s => s.id === editTargetSectionId) : activeSection}
                    onClose={() => setIsModalOpen(false)}
                    onSubmitted={() => {
                        // Maybe refresh?
                        alert("Your request has been submitted for review.");
                    }}
                    user={user}
                />
            )}
        </div>
    );
}
