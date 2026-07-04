import Navbar from "@/components/Navbar";
import videoAsset from "@/assets/how-to-download.mp4.asset.json";
import openVideoAsset from "@/assets/how-to-open.mp4.asset.json";

const HowToDownload = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-10 space-y-12">
        <section>
          <h1 className="text-4xl font-bold mb-2">How to Download</h1>
          <p className="text-muted-foreground mb-8">
            Meka balala ganna kohomada game ekak download karanne kiyala.
          </p>
          <div className="rounded-xl overflow-hidden glass shadow-glow max-w-4xl mx-auto">
            <video
              src={videoAsset.url}
              controls
              playsInline
              className="w-full h-auto bg-black"
            />
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-2">How to Game Open</h2>
          <p className="text-muted-foreground mb-8">
            Meka balala ganna kohomada download kara game eka open karanne kiyala.
          </p>
          <div className="rounded-xl overflow-hidden glass shadow-glow max-w-4xl mx-auto">
            <video
              src={openVideoAsset.url}
              controls
              playsInline
              className="w-full h-auto bg-black"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default HowToDownload;
