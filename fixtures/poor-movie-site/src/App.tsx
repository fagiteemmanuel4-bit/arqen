export const App = () => <main className="bg-gradient-to-b from-black to-slate-900">
  <nav className="rounded-xl shadow-xl p-6"><a href="/">Movies</a><a href="/genres">Genres</a><a href="/popular">Popular</a><a href="/watchlist">Watchlist</a><button><span aria-hidden="true">☰</span></button></nav>
  <section className="rounded-3xl shadow-2xl p-10"><h1>Movie Night</h1><button>Watch now</button><button>Trailer</button></section>
  <section><h2>Trending</h2>{Array.from({ length: 12 }).map((_, i) => <article className="rounded-2xl shadow-lg p-[15px]" key={i}><img src={`/movie-${i}.jpg`} /><h3>Movie {i}</h3><button>Details</button></article>)}</section>
  <section><h2>Search</h2><input placeholder="Search movies" /><button>Search</button></section>
  <a href="/details">Learn more</a>
</main>;
