"use client";

import { useEffect, useState, useRef } from "react";
import { SearchTool } from "./tools/SearchTool";
import { DocumentTool } from "./tools/DocumentTool";
import { ChangelogTool } from "./tools/ChangelogTool";
import { RepoTool } from "./tools/RepoTool";
import type { PartComponentProps } from "../types";

export function ToolInvocationPart({ part }: PartComponentProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  const isRelevantTool = 
    part.type === 'tool-getInformation' ||
    part.type === 'tool-getFullDocument' ||
    part.type === 'tool-getSDKChangelog' ||
    part.type === 'tool-askRepo';

  useEffect(() => {
    if (isRelevantTool && 'state' in part && (part.state === 'input-streaming' || part.state === 'input-available')) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      const interval = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRelevantTool, part]);

  // Type guard - only handle specific tool types
  if (!isRelevantTool) {
    return null;
  }

  // Additional type guard to ensure we have state property
  if (!('state' in part)) {
    return null;
  }

  const isSearchTool = part.type === 'tool-getInformation';
  const isDocumentTool = part.type === 'tool-getFullDocument';
  const isChangelogTool = part.type === 'tool-getSDKChangelog';
  const isRepoTool = part.type === 'tool-askRepo';

  const output = 'output' in part ? part.output : null;
  const input = 'input' in part ? part.input : null;

  // Route to specific tool component
  if (isSearchTool) {
    return <SearchTool state={part.state} input={input} output={output} elapsedTime={elapsedTime} />;
  }

  if (isDocumentTool) {
    return <DocumentTool state={part.state} input={input} output={output} elapsedTime={elapsedTime} />;
  }

  if (isChangelogTool) {
    return <ChangelogTool state={part.state} input={input} output={output} elapsedTime={elapsedTime} />;
  }

  if (isRepoTool) {
    return <RepoTool state={part.state} input={input} output={output} elapsedTime={elapsedTime} />;
  }

  // Fallback for unknown tool
  return null;
}
