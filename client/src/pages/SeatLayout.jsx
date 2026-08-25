import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assets } from "../assets/assets";
import Loading from "../components/Loading";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import isoTimeFormat from "../lib/isoTimeFormat";
import BlurCircle from "../components/BlurCircle";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

const SeatLayout = () => {
  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];
  const { id, date } = useParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);


  const navigate = useNavigate();
  const { axios, getToken, user, image_base_url } = useAppContext();

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);
      if (data.success) {
        setShow({
          movie: data.movie,
          dateTime: data.dateTime
        });
        if (data.dateTime && data.dateTime[date] && data.dateTime[date].length > 0) {
          const firstTime = data.dateTime[date][0];
          setSelectedTime(firstTime);
          if (firstTime.showId) {
            fetchOccupiedSeats(firstTime.showId);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchOccupiedSeats = async (showId) => {
    try {
      const { data } = await axios.get(`/api/booking/seats/${showId}`);
      if (data.success) {
        setOccupiedSeats(data.occupiedSeats || []);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSeatClick = (seatId) => {
    if (!selectedTime) {
      return toast("Please select a time slot first");
    }
    if (occupiedSeats.includes(seatId)) {
      return toast("This seat is already booked");
    }
    if (!selectedSeats.includes(seatId) && selectedSeats.length > 4) {
      return toast("You can select maximum 5 seats");
    }
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    );
  };

  const handleCheckout = async () => {
    try {
      if (!user) return toast.error("Please login to book tickets");
      if (!selectedTime) return toast.error("Please select a time slot");
      if (selectedSeats.length === 0) return toast.error("Please select at least one seat");
      if (selectedSeats.some(seat => occupiedSeats.includes(seat))) {
        return toast.error("Selected seats are already booked");
      }

      setBookingLoading(true);
      const token = await getToken({ skipCache: true });
      const { data } = await axios.post('/api/booking/create', {
        showId: selectedTime.showId,
        selectedSeats
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        window.location.href = data.url;
      } else {
        toast.error(data.message || "Booking failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Booking failed. Try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const renderSeats = (row, count = 9) => (
    <div className="flex gap-2 mt-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          const isOccupied = occupiedSeats.includes(seatId);
          const isSelected = selectedSeats.includes(seatId);
          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              className={`h-8 w-8 rounded border text-xs font-medium cursor-pointer transition ${
                isOccupied
                  ? "bg-gray-800 text-gray-500 border-gray-700"
                  : isSelected
                  ? "bg-primary text-white border-primary"
                  : "border-primary/60 hover:bg-primary/20"
              }`}
            >
              {seatId}
            </button>
          );
        })}
      </div>
    </div>
  );
  


  useEffect(() => {
    getShow();
  }, [id]);

  useEffect(() => {
    if (selectedTime?.showId) {
      fetchOccupiedSeats(selectedTime.showId);
      setSelectedSeats([]);
    }
  }, [selectedTime]);

  return show && show.dateTime && show.dateTime[date] ? (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50">
      {/* Available Timing */}
      <div
        className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max
    md:sticky md:top-30"
      >
        <p className="text-lg font-semibold px-6">Available Timing</p>
        <div className="mt-5 space-y-1">
          {show.dateTime[date].map((item) => (
            <div
              key={item.time}
              onClick={() => setSelectedTime(item)}
              className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${
                selectedTime?.time === item.time
                  ? "bg-primary text-white"
                  : " hover:bg-primary/20"
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              <p className="text-sm">{isoTimeFormat(item.time)}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Seat Layout */}
      <div className="relative flex-1 flex flex-col items-center max-md:mt-16">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />
        <h1 className="text-2xl font-semibold mb-4">Select your seat</h1>

        <img src={assets.screenImage} alt="screen" />
        <p className="text-gray-400 text-sm mb-6">SCREEN SIDE</p>
        <div className="flex flex-col items-center mt-10 text-xs text-gray-300">
          <div className="grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6">
            {groupRows[0].map((row) => renderSeats(row))}
          </div>
          <div className="grid grid-cols-2 gap-11">
            {groupRows.slice(1).map((group, idx) => (
              <div key={idx}>{group.map((row) => renderSeats(row))}</div>
            ))}
          </div>
        </div>
        <button
          disabled={bookingLoading}
          onClick={handleCheckout}
          className="flex items-center gap-1 mt-20 px-10 py-3 text-sm bg-primary hover:bg-primary-dull 
        transition rounded-full font-medium cursor-pointer active:scale-95 disabled:opacity-50"
        >
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
