"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentUploadDropzone } from "@/components/onboarding/DocumentUploadDropzone";
import { DocumentVerificationConsole } from "@/components/onboarding/DocumentVerificationConsole";
import { ExtractedProjectData } from "@/app/actions/document-intake-actions";

export default function OnboardingConductorPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"UPLOAD" | "VERIFY">("UPLOAD");
  const [stagingId, setStagingId] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedProjectData | null>(null);
  const [confidenceScores, setConfidenceScores] = useState<Record<string, number>>({});

  const handleExtractionComplete = (result: {
    stagingId: string;
    extracted: ExtractedProjectData;
    confidenceScores: Record<string, number>;
  }) => {
    setStagingId(result.stagingId);
    setExtractedData(result.extracted);
    setConfidenceScores(result.confidenceScores);
    setStage("VERIFY");
  };

  const handleVerificationSuccess = (projectId: string) => {
    router.push(`/?project_id=${projectId}`);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-10">
      {stage === "UPLOAD" && (
        <DocumentUploadDropzone onExtractionComplete={handleExtractionComplete} />
      )}

      {stage === "VERIFY" && extractedData && (
        <DocumentVerificationConsole
          stagingId={stagingId}
          initialData={extractedData}
          confidenceScores={confidenceScores}
          onVerificationSuccess={handleVerificationSuccess}
        />
      )}
    </main>
  );
}
