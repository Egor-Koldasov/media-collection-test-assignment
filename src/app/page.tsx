import Link from "next/link"

export default function Home() {
  return (
    <main className="demo-links">
      <Link href="/demos/raw-webgl-triangle">Raw WebGL2 Triangle</Link>
      <Link href="/demos/three-spinning-cube">Three.js Spinning Cube</Link>
      <Link href="/demos/demo1">Demo 1: Rotation</Link>
      <Link href="/demos/demo2">Demo 2: 3D WebGL basics</Link>
    </main>
  )
}
