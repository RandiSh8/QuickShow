import React, { useState } from "react";
import { dummyTrailers } from "../assets/assets";
import BlurCircle from "./BlurCircle";
import ReactPlayer from "react-player";

const TrailerSection = () => {
  const [currentTrailer] = useState(dummyTrailers[0]);
  const [playerError, setPlayerError] = useState(null);
  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 py-20 overflow-hidden">
      <p className="text-gray-300 font-medium text-lg max-w-[960px] mx-auto">
        Trailers
      </p>

      <div className="relative mt-6">
        <BlurCircle top="-100px" right="-100px" />

        <div
          className="mx-auto"
          style={{ maxWidth: 960, border: "1px solid rgba(255,255,255,0.04)" }}
        >
          {currentTrailer && currentTrailer.videoUrl ? (
            <ReactPlayer
              url={currentTrailer.videoUrl}
              // show thumbnail preview (click to load) which helps when embeds are blocked or autoplay is restricted
              light={currentTrailer.image}
              controls={true}
              className="mx-auto max-w-full"
              width="100%"
              height="540px"
              onError={(e) => {
                console.error("ReactPlayer error:", e);
                setPlayerError(String(e) || "unknown error");
              }}
              config={{
                youtube: {
                  playerVars: { modestbranding: 1, rel: 0 },
                },
              }}
            />
          ) : (
            <div className="text-gray-400 p-6">No trailer available</div>
          )}
          {playerError && (
            <div className="text-red-400 p-2">Player error: {playerError}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrailerSection;
