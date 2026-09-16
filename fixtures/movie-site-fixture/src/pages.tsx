export const MovieListing = () => <main><h1>Movies</h1><section>{["Dune", "Arrival", "Parasite", "Whiplash"].map((title) => <article key={title}><img src={`/posters/${title}.jpg`} /><h2>{title}</h2><p>Drama · 2024 · ★ 8.2</p><button>Details</button></article>)}</section></main>;

export const MovieDetail = () => <main><h1>Dune: Part Two</h1><p>2024 · Sci-Fi · 166 min · ★ 8.7</p><button>Watch trailer</button><button>Add to watchlist</button><h2>Overview</h2><p>Paul Atreides unites with Chani and the Fremen.</p></main>;

export const SearchPage = () => <main><h1>Search</h1><input placeholder="Search movies" /><button><span aria-hidden="true">⌕</span></button><p>Search results will appear here.</p></main>;
