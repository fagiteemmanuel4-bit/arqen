import type { Component, Project, Route } from "./domain.js";

export type ProjectGraphNodeKind = "project" | "route" | "component" | "style" | "token";

export interface ProjectGraphNode {
  id: string;
  kind: ProjectGraphNodeKind;
  label: string;
  file?: string;
}

export interface ProjectGraphEdge {
  from: string;
  to: string;
  relation: "contains" | "renders" | "styles" | "defines";
}

export interface ProjectGraph {
  nodes: ProjectGraphNode[];
  edges: ProjectGraphEdge[];
}

export function buildProjectGraph(project: Project): ProjectGraph {
  const nodes: ProjectGraphNode[] = [{ id: "project", kind: "project", label: project.name }];
  const edges: ProjectGraphEdge[] = [];

  for (const route of project.routes) addRoute(nodes, edges, route);
  for (const component of project.components) addComponent(nodes, edges, component);
  for (const file of project.files.filter((item) => /\.(css|scss|sass)$/.test(item.extension))) {
    const id = `style:${file.path}`;
    nodes.push({ id, kind: "style", label: file.path, file: file.path });
    edges.push({ from: "project", to: id, relation: "contains" });
  }
  for (const token of project.designSystem.tokens) {
    const id = `token:${token.name}`;
    if (!nodes.some((node) => node.id === id)) nodes.push({ id, kind: "token", label: token.name, file: token.source });
    const style = nodes.find((node) => node.kind === "style" && node.file === token.source);
    edges.push({ from: style?.id ?? "project", to: id, relation: "defines" });
  }
  return { nodes, edges };
}

function addRoute(nodes: ProjectGraphNode[], edges: ProjectGraphEdge[], route: Route) {
  const id = `route:${route.path}`;
  nodes.push({ id, kind: "route", label: route.path, file: route.file });
  edges.push({ from: "project", to: id, relation: "contains" });
}

function addComponent(nodes: ProjectGraphNode[], edges: ProjectGraphEdge[], component: Component) {
  const id = `component:${component.id}`;
  nodes.push({ id, kind: "component", label: component.name, file: component.file });
  edges.push({ from: "project", to: id, relation: "contains" });
}
