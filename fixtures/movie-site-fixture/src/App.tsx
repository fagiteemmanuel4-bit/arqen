import { useState } from "react";
import "./styles.css";

const movies = ["Dune: Part Two", "Arrival", "The Batman", "Whiplash", "Parasite", "Past Lives"];

function MovieCard({ title }: { title: string }) {
  return <article className="movie-card"><img src={`/posters/${title}.jpg`} /><div><h3>{title}</h3><p>★ 8.4</p><button>Details</button><button>Add to watchlist</button></div></article>;
}

const Navigation = () => <nav><a href="/">Cinebase</a><a href="/movies">Movies</a><a href="/genres">Genres</a><a href="/popular">Popular</a><a href="/watchlist">Watchlist</a></nav>;

export default function App() {
  const [query, setQuery] = useState("");
  const results = movies.filter((movie) => movie.toLowerCase().includes(query.toLowerCase()));
  return <main>
    <Navigation />
    <section className="hero"><div><p>FEATURED</p><h1>Dune: Part Two</h1><p>Paul Atreides joins Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.</p><button>Watch trailer</button><button>View details</button></div></section>
    <section className="toolbar"><label htmlFor="search">Search movies</label><input id="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles" /><button>Search</button><button>Genres</button><button>Sort</button></section>
    <section><h2>Trending this week</h2><div className="movie-grid">{results.map((movie) => <MovieCard key={movie} title={movie} />)}</div>{results.length === 0 && <p>No movies found. Try another search.</p>}</section>
    <section className="loading" aria-label="Loading movies"><p>Loading more movies…</p></section>
    <footer><a href="/about">About Cinebase</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></footer>
  </main>;
}
