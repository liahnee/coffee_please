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
    const [loadingContent, setLoadingContent] = useState(false);
    const [allContentVersions, setAllContentVersions] = useState<Map<string, WikiLatestVersion>>(new Map());
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
            setSearchParams({ slug: "_all" }, { replace: true });
            return;
        }

        if (slug === "_all") return; // Special mode

        const valid = sections.find(s => s.slug === slug);
        if (!valid) {
            setSearchParams({ slug: "_all" }, { replace: true });
        }
    }, [slug, loadingTOC, sections, setSearchParams]);

    // 3. Fetch Content
    useEffect(() => {
        if (!slug || sections.length === 0) return;

        (async () => {
            setLoadingContent(true);

            const targetSections = sections;

            // Fetch ALL versions for the target sections
            const { data: allVersions, error } = await supabase
                .from("wiki_latest_versions")
                .select("section_id, content, created_at, created_by, source_request_id")
                .in("section_id", targetSections.map(s => s.id));

            if (error) {
                console.error("Error fetching content:", error);
                setError("본문을 불러오는데 실패했습니다.");
            } else {
                const versionMap = new Map<string, WikiLatestVersion>(
                    (allVersions as any[] || []).map(v => [v.section_id, v as WikiLatestVersion])
                );
                setAllContentVersions(versionMap);
            }
            setLoadingContent(false);
        })();
    }, [slug, sections, tocTree]);


    // 4. Initial Scroll
    useEffect(() => {
        if (!loadingContent && slug && slug !== "_all" && allContentVersions.size > 0) {
            const targetId = `section-${slug}`;
            const el = document.getElementById(targetId);
            if (el) {
                // Short timeout to ensure DOM is fully ready
                setTimeout(() => {
                    el.scrollIntoView({ behavior: "smooth" });
                }, 100);
            }
        }
    }, [loadingContent, slug, allContentVersions.size]);

    const handleSelectSection = (newSlug: string) => {
        const targetId = `section-${newSlug}`;
        const el = document.getElementById(targetId);

        if (el) {
            el.scrollIntoView({ behavior: "smooth" });
            setSearchParams({ slug: newSlug }, { replace: true });
        } else {
            setSearchParams({ slug: newSlug });
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleViewAll = () => {
        setSearchParams({ slug: "_all" });
        window.scrollTo({ top: 0, behavior: "smooth" });
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

    const handleDeleteSpecificSection = (section: WikiSection) => {
        if (!user) {
            alert("Please login to propose changes.");
            return;
        }
        setModalMode("delete");
        setEditTargetSectionId(section.id);
        setAddParentSectionId(null);
        setIsModalOpen(true);
    };

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

    if (loadingTOC) {
        return <div style={{ padding: 40, textAlign: "center" }}>목차 로딩 중...</div>;
    }

    if (error && sections.length === 0) {
        return <div style={{ padding: 40, color: "red", textAlign: "center" }}>{error}</div>;
    }

    const renderSections = sections;

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

            <main style={{ flex: 1, minWidth: 0, paddingBottom: 60, padding: "0 24px" }}>
                {loadingContent && renderSections.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", fontStyle: "italic", color: "#888" }}>
                        본문 로딩 중...
                    </div>
                ) : (
                    <div className="wiki-content-list">
                        {renderSections.map((s) => {
                            const version = allContentVersions.get(s.id);
                            return (
                                <WikiContent
                                    key={s.id}
                                    sectionSlug={s.slug}
                                    title={s.title}
                                    markdown={version?.content || null}
                                    updatedAt={version?.created_at || null}
                                    depth={s.depth}
                                    onEdit={() => handleEditSpecificSection(s)}
                                    onDelete={() => handleDeleteSpecificSection(s)}
                                />
                            );
                        })}
                    </div>
                )}
            </main>

            {isModalOpen && (
                <EditRequestModal
                    mode={modalMode}
                    sectionId={editTargetSectionId || undefined}
                    parentSectionId={addParentSectionId}
                    sections={sections}
                    currentSection={editTargetSectionId ? sections.find(s => s.id === editTargetSectionId) : undefined}
                    onClose={() => setIsModalOpen(false)}
                    onSubmitted={() => {
                        // Refresh manually or via state? For now alert
                        alert("Your request has been submitted for review.");
                        setIsModalOpen(false);
                    }}
                    user={user}
                />
            )}
        </div>
    );
}
