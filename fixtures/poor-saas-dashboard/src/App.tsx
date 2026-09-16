export const App = () => <main className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 p-[13px]">
  <nav className="rounded-2xl shadow-xl p-8"><button>Menu</button><button>Settings</button><button>Billing</button><button>Help</button></nav>
  <section className="grid grid-cols-4 gap-[19px]">
    {Array.from({ length: 8 }).map((_, index) => <article className="rounded-xl shadow-lg p-[17px]" key={index}><h3>Metric {index}</h3><button>View</button></article>)}
  </section>
  <button className="rounded-full p-1"><span aria-hidden="true">+</span></button>
  <img src="/chart.png" />
</main>;
