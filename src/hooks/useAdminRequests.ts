import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import type { WikiEditRequest, WikiSection } from "../types/wiki";

export type RequestGroup = {
    sectionId: string | "new";
    sectionTitle: string;
    requests: WikiEditRequest[];
};

export type RequestDetailData = {
    baseVersion: { content: string } | null; // simplified type
    latestVersion: { content: string; version_id: string } | null;
    currentSection: WikiSection | null; // For Edit
    siblings: WikiSection[]; // For Reorder/Add
};

export function useAdminRequests() {
    const [stats, setStats] = useState({ pendingCount: 0 });
    const [groups, setGroups] = useState<RequestGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from("wiki_edit_requests")
                .select("*")
                .eq("status", "pending")
                .order("requested_at", { ascending: false });

            if (error) throw error;

            // Group by section
            const grouped: Record<string, WikiEditRequest[]> = {};
            const newRequests: WikiEditRequest[] = [];

            // We need to fetch section titles for grouping headers
            // Unique section IDs involved
            const sectionIds = new Set<string>();
            data?.forEach(r => {
                if ((r.request_type === 'edit_section' || r.request_type === 'delete_section') && r.section_id) {
                    sectionIds.add(r.section_id);
                }
            });

            // Fetch section titles
            let sectionMap = new Map<string, string>();
            if (sectionIds.size > 0) {
                const { data: secData } = await supabase
                    .from("wiki_sections")
                    .select("id, title")
                    .eq("is_deleted", false)
                    .in("id", Array.from(sectionIds));

                secData?.forEach(s => sectionMap.set(s.id, s.title));
            }

            data?.forEach(r => {
                if (r.request_type === 'add_section') {
                    newRequests.push(r);
                } else if (r.section_id) {
                    if (!grouped[r.section_id]) grouped[r.section_id] = [];
                    grouped[r.section_id].push(r);
                }
            });

            const resultGroups: RequestGroup[] = [];

            // Add "New Sections" group first if exists
            if (newRequests.length > 0) {
                resultGroups.push({
                    sectionId: "new",
                    sectionTitle: "New Sections",
                    requests: newRequests
                });
            }

            // Add Edit groups
            for (const [secId, reqs] of Object.entries(grouped)) {
                resultGroups.push({
                    sectionId: secId,
                    sectionTitle: sectionMap.get(secId) || "Unknown Section",
                    requests: reqs
                });
            }

            setGroups(resultGroups);
            setStats({ pendingCount: data?.length || 0 });

        } catch (err: any) {
            console.error("Fetch Requests Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Fetch Detail Data Helper
    const fetchRequestDetail = useCallback(async (request: WikiEditRequest): Promise<RequestDetailData> => {
        const result: RequestDetailData = {
            baseVersion: null,
            latestVersion: null,
            currentSection: null,
            siblings: []
        };

        // 1. Fetch Base Version (if exists)
        if (request.base_version_id) {
            const { data } = await supabase
                .from("wiki_section_versions")
                .select("content")
                .eq("id", request.base_version_id)
                .maybeSingle();
            if (data) result.baseVersion = data;
        }

        // 2. Fetch Latest Version & Section (For Edit/Delete)
        if ((request.request_type === 'edit_section' || request.request_type === 'delete_section') && request.section_id) {
            const { data: latest } = await supabase
                .from("wiki_latest_versions")
                .select("content, version_id")
                .eq("section_id", request.section_id)
                .maybeSingle();
            if (latest) result.latestVersion = latest as any;

            const { data: section } = await supabase
                .from("wiki_sections")
                .select("*")
                .eq("id", request.section_id)
                .maybeSingle();
            if (section) result.currentSection = section;
        }

        // 3. Fetch Siblings (For Add order placement, or Edit reorder)
        // If Add: use request.parent_section_id
        // If Edit: use currentSection.parent_id
        let parentId: string | null = null;
        if (request.request_type === 'add_section') {
            parentId = request.parent_section_id;
        } else if (result.currentSection) {
            parentId = result.currentSection.parent_id;
        }

        // Fetch siblings query
        // Supabase `is` for null
        let q = supabase.from("wiki_sections").select("*").eq("is_deleted", false);
        if (parentId) q = q.eq("parent_id", parentId);
        else q = q.is("parent_id", null);

        const { data: siblings } = await q.order('order_index');
        if (siblings) result.siblings = siblings;

        return result;
    }, []);

    return {
        groups,
        loading,
        error,
        refresh: fetchRequests,
        fetchRequestDetail,
        stats
    };
}
