import dynamic from "next/dynamic";

const SkywayNexusApp = dynamic(() => import("@/components/SkywayNexusApp"), {
  ssr: false,
});

export default function Home() {
  return <SkywayNexusApp />;
}
