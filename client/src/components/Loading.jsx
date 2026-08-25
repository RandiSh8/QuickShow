import React, { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";

const Loading = () => {
  const { nextUrl } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const session_id = searchParams.get("session_id");

    if (session_id || nextUrl) {
      const verify = async () => {
        if (session_id) {
          try {
            await axios.post("/api/booking/verify-payment", { session_id });
          } catch (err) {
            console.error(err);
          }
        }
        setTimeout(() => {
          navigate("/" + (nextUrl || "my-bookings"));
        }, 1500);
      };

      verify();
    }
  }, [nextUrl, searchParams, navigate]);

  return (
    <div className="flex justify-center items-center h-[80vh]">
      <div className="animate-spin rounded-full h-14 w-14 border-2 border-t-primary"></div>
    </div>
  );
};

export default Loading;
