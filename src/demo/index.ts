import type { ComponentType } from "react";
import {
  RawWebglTriangleDemo,
  rawWebglTriangleMeta
} from "./raw-webgl-triangle";
import {
  ThreeSpinningCubeDemo,
  threeSpinningCubeMeta
} from "./three-spinning-cube";

export type DemoMeta = {
  slug: string;
  title: string;
  stage: string;
  description: string;
};

export type DemoDefinition = DemoMeta & {
  Component: ComponentType;
};

export const demos = [
  {
    ...rawWebglTriangleMeta,
    Component: RawWebglTriangleDemo
  },
  {
    ...threeSpinningCubeMeta,
    Component: ThreeSpinningCubeDemo
  }
] satisfies DemoDefinition[];

export function getDemo(slug: string) {
  return demos.find((demo) => demo.slug === slug);
}

export function getDemoSlugs() {
  return demos.map((demo) => demo.slug);
}
