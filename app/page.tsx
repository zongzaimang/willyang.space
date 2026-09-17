import hc65Cover from '../assets/hc65-uhe/01-cover-alpha.png';
import p1sCover from '../assets/projects/210805-synco-p1s/01@1x.jpg';
import pl8rCover from '../assets/projects/201201-colbor-pl8-r/00@1x.webp';
import cl60Cover from '../assets/projects/210825-colbor-cl60/01@1x.webp';
import mc2Cover from '../assets/projects/210112-synco-mc2/01@1x.webp';

const projects = [
  { name: 'HC65 UHE', brand: 'NITECORE', year: '2024', image: hc65Cover, position: 'contain' },
  { name: 'CL60', brand: 'COLBOR', year: '2021', image: cl60Cover, position: 'cover' },
  { name: 'P1S', brand: 'SYNCO', year: '2021', image: p1sCover, position: 'cover' },
  { name: 'MC2', brand: 'SYNCO', year: '2021', image: mc2Cover, position: 'cover' },
  { name: 'PL8-R', brand: 'COLBOR', year: '2020', image: pl8rCover, position: 'cover' },
];

export default function Home() {
  return <main>
    <header className="site-header"><a className="wordmark" href="#top" aria-label="Will Yang Studio home">WILL YANG<br />STUDIO</a><p>Industrial designer<br />Shanghai / Worldwide</p><a className="contact-link" href="mailto:hello@wenyang.design">Let&apos;s work <span>↗</span></a></header>
    <section className="intro" id="top"><p className="kicker">Selected works</p><h1>Objects made<br />to be used.</h1><p className="intro-copy">A selection of industrial-design projects shaped from first ideas through to manufacturable objects.</p></section>
    <section className="work-grid" aria-label="Selected industrial design projects">{projects.map((project, index) => <article className="project-card" key={project.name}><div className="project-image"><img src={project.image.src} alt={`${project.brand} ${project.name}`} className={project.position} /><span className="project-number">{String(index + 1).padStart(2, '0')}</span></div><div className="project-meta"><h2>{project.name}</h2><p>{project.brand}</p><time>{project.year}</time></div></article>)}</section>
    <footer id="contact"><p>Have an idea that needs a body?</p><a href="mailto:hello@wenyang.design">hello@wenyang.design <span>↗</span></a><small>© 2026 WILL YANG STUDIO</small></footer>
  </main>;
}
