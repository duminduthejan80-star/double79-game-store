import Navbar from "@/components/Navbar";
import freeVideoAsset from "@/assets/how-to-download-free.mp4.asset.json";
import proVideoAsset from "@/assets/how-to-download-pro.mp4.asset.json";
import openVideoAsset from "@/assets/how-to-open.mp4.asset.json";

const VideoBlock = ({ src }: { src: string }) => (
  <div className="rounded-xl overflow-hidden glass shadow-glow max-w-4xl mx-auto">
    <video src={src} controls playsInline className="w-full h-auto bg-black" />
  </div>
);

const HowToDownload = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-10 space-y-12">
        <section>
          <h1 className="text-4xl font-bold mb-2">How to Download — Free</h1>
          <p className="text-muted-foreground mb-8">
            Meka balala ganna kohomada free eken game ekak download karanne kiyala.
          </p>
          <VideoBlock src={freeVideoAsset.url} />
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-2">How to Download — Pro</h2>
          <p className="text-muted-foreground mb-8">
            Meka balala ganna kohomada Pro eken game ekak download karanne kiyala.
          </p>
          <VideoBlock src={proVideoAsset.url} />
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-2">How to Game Open</h2>
          <p className="text-muted-foreground mb-8">
            Meka balala ganna kohomada download kara game eka open karanne kiyala.
          </p>
          <VideoBlock src={openVideoAsset.url} />
        </section>
      </div>
    </div>
  );
};

export default HowToDownload;
