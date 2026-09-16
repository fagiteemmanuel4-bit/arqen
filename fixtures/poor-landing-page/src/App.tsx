export const App = () => <main>
  <nav><a href="/">Home</a><a href="/pricing">Pricing</a><a href="/docs">Docs</a><a href="/about">About</a><a href="/blog">Blog</a><a href="/contact">Contact</a></nav>
  <section className="rounded-3xl shadow-2xl bg-gradient-to-r from-purple-600 to-pink-500 p-[27px]"><h1 className="text-7xl">The Future of Everything</h1><p>We make things better.</p><button>Get Started</button><button>Learn More</button></section>
  <section>{Array.from({ length: 6 }).map((_, i) => <div className="rounded-xl shadow-lg p-[11px]" key={i}><h3>Feature</h3><p>Feature description.</p></div>)}</section>
  <a href="/more">Click here</a>
</main>;
