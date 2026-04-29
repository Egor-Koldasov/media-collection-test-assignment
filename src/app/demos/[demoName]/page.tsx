import { notFound } from "next/navigation";
import { getDemo, getDemoSlugs } from "@/demo";

type DemoPageProps = {
  params: Promise<{
    demoName: string;
  }>;
};

export function generateStaticParams() {
  return getDemoSlugs().map((demoName) => ({ demoName }));
}

export async function generateMetadata({ params }: DemoPageProps) {
  const { demoName } = await params;
  const demo = getDemo(demoName);

  if (!demo) {
    return {
      title: "Demo not found"
    };
  }

  return {
    title: `${demo.title} | WebGL and Three.js Demo Library`,
    description: demo.description
  };
}

export default async function DemoPage({ params }: DemoPageProps) {
  const { demoName } = await params;
  const demo = getDemo(demoName);

  if (!demo) {
    notFound();
  }

  const DemoComponent = demo.Component;

  return <DemoComponent />;
}
