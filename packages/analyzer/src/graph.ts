import { buildProjectGraph, type ProjectGraph } from "@arqen/core";
import type { Project } from "@arqen/core";

/** Build a stable framework-neutral graph from the analyzer's project model. */
export function analyzeProjectGraph(project: Project): ProjectGraph {
  return buildProjectGraph(project);
}
