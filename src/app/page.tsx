import Link from "next/link";
import { demos } from "@/demo";

export default function Home() {
  return (
    <main className="demo-links">
      {demos.map((demo) => (
        <Link href={`/demos/${demo.slug}`} key={demo.slug}>
          {demo.title}
        </Link>
      ))}
    </main>
  );
}
