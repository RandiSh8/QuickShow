




import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";

// API to get now playing movies from TMDB API
export const getNowPlayingMovies = async (req, res) => {
    try {
        const { data } = await axios.get('https://api.themoviedb.org/3/movie/now_playing', {
            headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
        });
        const movies = data.results;
        res.json({ success: true, movies: movies });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};



// API to add a new show to the database
export const addShow = async (req, res) => {
    try {
        const { movieId, showsInput, showPrice } = req.body;
        let movie = await Movie.findById(movieId);

        if (!movie) {
            // Fetch movie details and credits from TMDB API
            const [movieDetailsResponse, movieCreditResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }),
                axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } })
            ]);

            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditResponse.data;

            const movieDetails = {
                _id: movieId,
                title: movieApiData.title,
                overview: movieApiData.overview,
                poster_path: movieApiData.poster_path,
                backdrop_path: movieApiData.backdrop_path,
                release_date: movieApiData.release_date,
                original_language: movieApiData.original_language,
                tagline: movieApiData.tagline || "",
                genres: movieApiData.genres, 
                casts: movieCreditsData.cast || [],
                vote_average: movieApiData.vote_average || 0,
                runtime: movieApiData.runtime || 0
            };

            // Add movie to the database
            movie = await Movie.create(movieDetails);
        }

        const showsToCreate = [];
        if (showsInput && Array.isArray(showsInput)) {
            showsInput.forEach(show => {
                const showDate = show.date;
                if (show.time && Array.isArray(show.time)) {
                    show.time.forEach((time) => {
                        const showDateTime = `${showDate}T${time}`;
                        showsToCreate.push({
                            movie: movieId,
                            showDateTime,
                            showPrice,
                            occupiedSeats: {} 
                        });
                    });
                }
            });
        }

        if (showsToCreate.length > 0) {
            await Show.insertMany(showsToCreate);
        }
        // Trigger Inngest event
        await inngest.send({
            name: "app/show.added",
            data: {
                movieTitle: movie.title
            }
        })
        res.json({ success: true, message: "Shows added successfully" });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });  
    }
};


// API to get all shows from the database
export const getShows = async (req, res) => {
    try {
        const currentIsoDate = new Date().toISOString().slice(0, 10);
        const shows = await Show.find({ showDateTime: { $gte: currentIsoDate } })
            .populate('movie')
            .sort({ showDateTime: 1 });

        // Filter unique movies from shows
        const uniqueMoviesMap = new Map();
        shows.forEach(show => {
            if (show.movie && show.movie._id) {
                uniqueMoviesMap.set(show.movie._id.toString(), show.movie);
            }
        });

        res.json({ success: true, shows: Array.from(uniqueMoviesMap.values()) });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

// API to get a single show from the database
export const getShow = async (req, res) => {
    try {
        const { movieId } = req.params;
        const currentIsoDate = new Date().toISOString();
        // get all upcoming shows for the movie
        const shows = await Show.find({
            movie: movieId,
            showDateTime: { $gte: currentIsoDate }
        });

        const movie = await Movie.findById(movieId);
        const dateTime = {};
        shows.forEach((show) => {
            const date = typeof show.showDateTime === 'string' ? show.showDateTime.split('T')[0] : new Date(show.showDateTime).toISOString().split('T')[0];
            if (!dateTime[date]) {
                dateTime[date] = [];
            }
            dateTime[date].push({ time: show.showDateTime, showId: show._id });
        });
        res.json({ success: true, movie, dateTime });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};
    