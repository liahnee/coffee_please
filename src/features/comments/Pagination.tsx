type PaginationProps = {
    page: number;
    totalPages: number;
    totalCount: number;
    pageNumbers: number[];
    canPrev: boolean;
    canNext: boolean;
    setPage: (p: number | ((prev: number) => number)) => void;
};

export default function Pagination({
    page,
    totalPages,
    totalCount,
    pageNumbers,
    canPrev,
    canNext,
    setPage,
}: PaginationProps) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 10,
            }}
        >
            <button
                type="button"
                disabled={!canPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
                Prev
            </button>

            {pageNumbers[0] !== 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => setPage(1)}
                        style={{
                            fontWeight: page === 1 ? 800 : 400,
                            textDecoration: page === 1 ? "underline" : "none",
                        }}
                    >
                        1
                    </button>
                    <span>…</span>
                </>
            )}

            {pageNumbers.map((p) => (
                <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    style={{
                        fontWeight: page === p ? 800 : 400,
                        textDecoration: page === p ? "underline" : "none",
                    }}
                >
                    {p}
                </button>
            ))}

            {pageNumbers[pageNumbers.length - 1] !== totalPages && (
                <>
                    <span>…</span>
                    <button
                        type="button"
                        onClick={() => setPage(totalPages)}
                        style={{
                            fontWeight: page === totalPages ? 800 : 400,
                            textDecoration: page === totalPages ? "underline" : "none",
                        }}
                    >
                        {totalPages}
                    </button>
                </>
            )}

            <button
                type="button"
                disabled={!canNext}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
                Next
            </button>

            <span style={{ color: "#666", marginLeft: 6 }}>
                Page {page} / {totalPages} · Total {totalCount}
            </span>
        </div>
    );
}
