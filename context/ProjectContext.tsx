"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface ProjectContextType {
    activeProjectId: string;
    setActiveProjectId: (id: string) => void;
    projectName: string;
    gccProtocol: string;
    contractValue: number;
}

const ProjectContext = createContext<ProjectContextType>({
    activeProjectId: "GOMTI-NAGAR-PH1-FITOUT",
    setActiveProjectId: () => { },
    projectName: "Gomti Nagar Extension Commercial Hub Ph-1",
    gccProtocol: "CPWD GCC Cl. 14 / FIDIC Red Book",
    contractValue: 450000000,
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [activeProjectId, setActiveProjectId] = useState("GOMTI-NAGAR-PH1-FITOUT");
    const [projectMeta, setProjectMeta] = useState({
        projectName: "Gomti Nagar Extension Commercial Hub Ph-1",
        gccProtocol: "CPWD GCC Cl. 14 / FIDIC Red Book",
        contractValue: 450000000,
    });

    useEffect(() => {
        if (activeProjectId === "PRJ-001" || activeProjectId === "GOMTI-NAGAR-PH1-FITOUT") {
            setProjectMeta({
                projectName: "Tower A Core & Shell Commercial Complex",
                gccProtocol: "CPWD Works Manual 2024",
                contractValue: 125000000,
            });
        } else {
            setProjectMeta({
                projectName: "Gomti Nagar Extension Commercial Hub Ph-1",
                gccProtocol: "CPWD GCC Cl. 14 / FIDIC Red Book",
                contractValue: 450000000,
            });
        }
    }, [activeProjectId]);

    return (
        <ProjectContext.Provider
            value={{
                activeProjectId,
                setActiveProjectId,
                ...projectMeta,
            }}
        >
            {children}
        </ProjectContext.Provider>
    );
}

export const useProject = () => useContext(ProjectContext);