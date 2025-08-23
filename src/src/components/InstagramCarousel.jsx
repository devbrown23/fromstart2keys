import InstagramCarousel from "@/components/InstagramCarousel";

export default function Home() {
  return (
    <div className="px-4 py-12">
      <InstagramCarousel
        images={[
          "/images/slide1.jpg",
          "/images/slide2.jpg",
          "/images/slide3.jpg",
        ]}
        instagramUrl="https://instagram.com/devinmyagent"
        intervalMs={3500}
      />
    </div>
  );
}
