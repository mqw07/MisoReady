import { useEffect, useRef, useState, type FormEvent, type SVGProps } from "react";
import { Link } from "react-router";
import misoFace from "../assets/miso/avatar.png";
import books from "../assets/landing/books.png";
import misoReading from "../assets/landing/miso-reading.png";
import flowers from "../assets/landing/flowers.png";
import { matchAnswer } from "../services/answerMatching/matchAnswer.ts";
import { appPaths } from "../routes.ts";
import "./landing.css";

type IconName = "book" | "file" | "keyboard" | "cards" | "review" | "pencil" | "arrow" | "check";

function LandingIcon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<IconName, React.ReactNode> = {
    book: <><path d="M12 6C8 3 4 4 2 5v14c3-2 7-1 10 1 3-2 7-3 10-1V5c-3-2-7-1-10 1Z"/><path d="M12 6v14M6 8h2M6 11h2M16 8h2M16 11h2"/></>,
    file: <><path d="M5 2h10l5 5v15H5V2Z"/><path d="M15 2v6h5M8 11h8M8 15h8M8 18h5"/></>,
    keyboard: <><path d="M3 5h18l2 2v12H1V7l2-2Z"/><path d="M4 9h2m2 0h2m2 0h2m2 0h2m2 0h1M4 12h2m2 0h2m2 0h2m2 0h2m2 0h1M5 16h3m2 0h8"/></>,
    cards: <><path d="M3 2h15v17H3zM18 5h3v17H6v-3"/><path d="M21 8h2v16H9v-2"/></>,
    review: <><path d="M20 9A8 8 0 0 0 6 5L3 8m0-5v5h5M4 15a8 8 0 0 0 14 4l3-3m0 5v-5h-5"/></>,
    pencil: <><path d="m4 16-1 5 5-1L21 7l-4-4L4 16ZM14 6l4 4M4 16l4 4"/></>,
    arrow: <path d="M3 12h17m-6-6 6 6-6 6"/>,
    check: <path d="m5 12 5 5L20 7"/>,
  };
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

const examples = [
  { before: "A", after: "has constant density over a given interval.", term: "uniform distribution", definition: "A uniform distribution has constant density over a given interval.", aliases: ["uniform random variable", "uniform continuous distribution", "continuous uniform distribution"] },
  { before: "The", after: "is the average outcome over many repetitions.", term: "expected value", definition: "The expected value is the average outcome over many repetitions.", aliases: ["expectation", "mean"] },
  { before: "A", after: "assigns a number to each outcome of an experiment.", term: "random variable", definition: "A random variable assigns a number to each outcome of an experiment.", aliases: [] },
];

function ExampleSession() {
  const [mode, setMode] = useState<"Learn" | "Review" | "Cards">("Learn");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const example = examples[index]!;

  function next() {
    setIndex(current => (current + 1) % examples.length);
    setAnswer("");
    setCorrect(null);
    setRevealed(false);
    inputRef.current?.focus();
  }

  function check(event: FormEvent) {
    event.preventDefault();
    if (answer.trim()) setCorrect(matchAnswer(answer, example.term, example.aliases).correct);
  }

  return <section className="landing-window pixel-box" aria-label="Example learning session">
    <div className="landing-window-title"><span><LandingIcon name="book" />Example learning session</span><span className="landing-window-dots" aria-hidden="true"><i/><i/><i/></span></div>
    <div className="landing-window-body">
      <aside className="landing-demo-sidebar">
        <div className="landing-demo-course"><span className="landing-course-icon"><LandingIcon name="file" /></span><div><strong>Probability</strong><span>Week 7</span><span>12 concepts</span></div></div>
        <div className="landing-demo-modes" role="group" aria-label="Example study mode">
          {(["Learn", "Review", "Cards"] as const).map(label => <button type="button" key={label} aria-pressed={mode === label} onClick={() => { setMode(label); setCorrect(null); setRevealed(false); }}><LandingIcon name={label === "Learn" ? "book" : label === "Review" ? "review" : "cards"} />{label}</button>)}
        </div>
        <span className="landing-demo-note">A little preview. All yours to try.</span>
      </aside>
      <div className="landing-demo-main">
        <div className="landing-demo-progress"><span>{index + 1} / {examples.length}</span><span className="landing-progress-track" role="progressbar" aria-label="Example progress" aria-valuemin={0} aria-valuemax={examples.length} aria-valuenow={index + 1}><i style={{ width: `${(index + 1) / examples.length * 100}%` }}/></span></div>
        <div className="landing-demo-label"><LandingIcon name={mode === "Learn" ? "pencil" : mode === "Review" ? "review" : "cards"} />{mode === "Learn" ? "Fill in the blank" : mode === "Review" ? "Recall, then reveal" : "Example flashcards"}</div>
        <div className="landing-question pixel-box">
          {mode === "Cards" ? <div className="landing-sample-card"><span>CONCEPT {index + 1}</span><h3>{example.term}</h3><p>{example.definition}</p><button className="landing-text-button" onClick={next}>Next example <LandingIcon name="arrow" /></button></div> : mode === "Review" ? <div className="landing-sample-card"><h3>{example.before} _____ {example.after}</h3>{revealed ? <p className="landing-revealed">{example.term}</p> : null}<button className="landing-check" onClick={revealed ? next : () => setRevealed(true)}>{revealed ? "Next example" : "Reveal answer"}</button></div> : <form onSubmit={check}>
            <h3>{example.before} <span className="landing-blank">_____</span> {example.after}</h3>
            <div className="landing-answer-row"><label className="sr-only" htmlFor="demo-answer">Your answer</label><input ref={inputRef} id="demo-answer" autoComplete="off" placeholder="Your answer" value={answer} onChange={event => { setAnswer(event.target.value); setCorrect(null); }} readOnly={correct !== null} /><button className="landing-check" type={correct !== null ? "button" : "submit"} onClick={correct !== null ? next : undefined}>{correct !== null ? "Try another" : "Check answer"}</button></div>
            <div className="landing-demo-bottom"><span className={correct === false ? "landing-feedback-wrong" : ""} role="status">{correct === null ? "This example is for you!" : correct ? "✓ Correct. Nicely remembered!" : `Not quite. The answer is ${example.term}.`}</span><span className="landing-enter"><LandingIcon name="keyboard" />Press Enter to check</span></div>
          </form>}
        </div>
      </div>
    </div>
  </section>;
}

function Cloud({ className }: { className: string }) {
  return <svg className={`landing-cloud ${className}`} viewBox="0 0 140 60" aria-hidden="true" shapeRendering="crispEdges"><path fill="#fff9ec" d="M0 43h20V31h12V20h12V8h12V0h18v7h8v15h12v8h17v12h29v6H0Z"/><path fill="#e0f0f9" d="M25 43h15v-7h9v12h13v6h36v-7h12v-5h13v10H58v8H33v-9h-8Z"/></svg>;
}

export function LandingPage() {
  useEffect(() => { document.title = "Miso — A calmer way to learn"; }, []);
  return <div className="landing">
    <a className="landing-skip" href="#landing-main">Skip to content</a>
    <div className="landing-sky">
      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="Miso home"><img src={misoFace} alt="" width="48" height="44"/><span>Miso</span></Link>
        <nav aria-label="Landing page"><a href="#how-it-works">How it works</a><a href="#features">Features</a><Link className="landing-button landing-button-small pixel-box" to={appPaths.home}>Open Miso</Link></nav>
      </header>
      <main id="landing-main">
        <div className="landing-intro">
          <p className="landing-eyebrow">YOUR NOTES. YOUR PACE.</p>
          <h1>A calmer way to <span>learn.</span></h1>
          <p className="landing-subtitle">From lecture notes to confident recall, one thoughtful session at a time.</p>
          <Link to={appPaths.home} className="landing-button landing-button-primary pixel-box">Start with your notes <LandingIcon name="arrow" /></Link>
          <a className="landing-explore" href="#how-it-works">Explore Miso <LandingIcon name="arrow" /></a>
        </div>
        <div className="landing-stage">
          <ExampleSession />
          <div className="landing-scenery" aria-hidden="true"><img className="landing-books-left" src={books} alt="" width="132" height="91"/><img className="landing-flowers" src={flowers} alt="" width="112" height="195"/><img className="landing-reading-cat" src={misoReading} alt="" width="184" height="157"/><img className="landing-books-right" src={books} alt="" width="110" height="76"/><span className="landing-cat-spark">!</span></div>
        </div>
      </main>
      <Cloud className="landing-cloud-left"/><Cloud className="landing-cloud-right"/><Cloud className="landing-cloud-small"/>
      <span className="landing-star landing-star-one" aria-hidden="true"/><span className="landing-star landing-star-two" aria-hidden="true"/><span className="landing-star landing-star-three" aria-hidden="true"/>
    </div>
    <section id="how-it-works" className="landing-how" aria-labelledby="how-heading">
      <h2 id="how-heading">From notes to knowledge.</h2>
      <div className="landing-heading-mark" aria-hidden="true"/>
      <div className="landing-steps">
        <article><LandingIcon name="file"/><span className="landing-step-number">01</span><div><h3>Upload your notes</h3><p>Turn your lecture notes or PDFs into editable AI flashcard drafts.</p></div></article>
        <span className="landing-step-arrow" aria-hidden="true">⟶</span>
        <article><LandingIcon name="keyboard"/><span className="landing-step-number">02</span><div><h3>Practice your recall</h3><p>Review your drafts, then study with typing and fill in the blank questions.</p></div></article>
        <span className="landing-step-arrow" aria-hidden="true">⟶</span>
        <article><LandingIcon name="cards"/><span className="landing-step-number">03</span><div><h3>Build lasting memory</h3><p>Return with spaced repetition to reinforce what you know.</p></div></article>
      </div>
    </section>
    <section id="features" className="landing-features" aria-labelledby="features-heading">
      <div className="landing-features-copy"><p className="landing-eyebrow">A LITTLE PROGRESS. A LITTLE COMPANY.</p><h2 id="features-heading">Make room for your own pace.</h2><p>Organize your courses, turn notes into cards you can edit, and come back to what’s due. Miso keeps you company along the way.</p><div className="landing-feature-pills"><span><LandingIcon name="check"/>Editable AI drafts</span><span><LandingIcon name="check"/>Spaced repetition</span><span><LandingIcon name="check"/>A study companion</span></div></div>
      <div className="landing-companion pixel-box"><img src={misoReading} alt="Miso the white cat reading a blue book" width="172" height="147" loading="lazy"/><div><h3>Meet your study buddy.</h3><p>Earn points as you study and choose a little something for Miso in the shop.</p></div></div>
    </section>
    <section className="landing-start"><p className="landing-eyebrow">ONE THOUGHTFUL SESSION AT A TIME.</p><h2>Your next chapter starts here.</h2><Link to={appPaths.home} className="landing-button landing-button-primary pixel-box">Open Miso <LandingIcon name="arrow"/></Link><p>Progress is saved on this device. No account needed.</p></section>
    <footer className="landing-footer"><Link to="/" className="landing-brand"><img src={misoFace} alt="" width="34" height="31"/><span>Miso</span></Link><span>Your notes. Your pace.</span><a href="#landing-main">Back to top ↑</a></footer>
  </div>;
}
