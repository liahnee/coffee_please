import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

type MainLayoutProps = {
    children: ReactNode;
    headerProps: any; // Passing props down for simplicity in this refactor
};

export default function MainLayout({ children, headerProps }: MainLayoutProps) {
    return (
        <div
            style={{
                maxWidth: 820,
                margin: "0 auto",
                minHeight: "calc(100vh - 4rem)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
            }}
        >
            <div>
                <Header {...headerProps} />
                {children}
            </div>
            <Footer />
        </div>
    );
}
