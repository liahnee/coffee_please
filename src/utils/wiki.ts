import type { WikiSection, TocNode } from "../types/wiki";

export function buildTocTree(flatSections: WikiSection[]): TocNode[] {
    const nodeMap: Record<string, TocNode> = {};
    const roots: TocNode[] = [];

    // Create all nodes first
    flatSections.forEach(s => {
        nodeMap[s.id] = {
            id: s.id,
            title: s.title,
            slug: s.slug,
            parent_id: s.parent_id,
            order_index: s.order_index,
            children: [],
            data: s
        };
    });

    // Build the tree
    flatSections.forEach(s => {
        const node = nodeMap[s.id];
        if (s.parent_id && nodeMap[s.parent_id]) {
            nodeMap[s.parent_id].children.push(node);
        } else {
            roots.push(node);
        }
    });

    // Recursive sort function
    const sortNodes = (nodes: TocNode[]) => {
        nodes.sort((a, b) => {
            const aOrder = a.order_index ?? Number.MAX_SAFE_INTEGER;
            const bOrder = b.order_index ?? Number.MAX_SAFE_INTEGER;

            if (aOrder !== bOrder) return aOrder - bOrder;
            return a.title.localeCompare(b.title);
        });
        nodes.forEach(n => sortNodes(n.children));
    };

    sortNodes(roots);
    return roots;
}

/**
 * Flattens a tree back into a flat array while preserving the hierarchical sort order.
 * Updates depth based on the tree structure.
 */
export function flattenTocTree(nodes: TocNode[], depth = 0): WikiSection[] {
    const result: WikiSection[] = [];

    nodes.forEach(node => {
        const section: WikiSection = {
            ...node.data,
            depth: depth // Update depth based on hierarchy
        };

        result.push(section);
        if (node.children.length > 0) {
            result.push(...flattenTocTree(node.children, depth + 1));
        }
    });

    return result;
}
