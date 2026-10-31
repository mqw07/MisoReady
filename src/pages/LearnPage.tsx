import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { StudyCompanion } from "../components/miso/StudyCompanion.tsx";
import { PageHeader } from "../components/layout/PageHeader.tsx";
import { Button, ButtonLink } from "../components/ui/Button.tsx";
import { TextField } from "../components/ui/TextField.tsx";
import { useLibrary } from "../features/library/useLibrary.ts";
import { startLearn, reconcileLearn, question, submit, grade, types, type LearnSession } from "../features/study/learn.ts";
import { playLearnTone, startFocusMusic } from "../features/study/learnAudio.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";

const labels = { flashcard: "Flashcards", trueFalse: "True / false", written: "Typing", fillBlank: "Fill in the blank" };

export function LearnPage() {
  usePageTitle("Learn");
  const [params] = useSearchParams();
  const courseId = params.get("courseId");
  const unitId = params.get("unitId");
  const sessionKey = JSON.stringify([courseId, unitId]);
  return <LearnSessionScreen key={sessionKey} sessionKey={sessionKey} courseId={courseId} unitId={unitId} />;
}

function LearnSessionScreen({ sessionKey, courseId, unitId }: {
  sessionKey: string; courseId: string | null; unitId: string | null;
}) {
  const { state, cards, saveLearnSession, writeReady, persistBlocked } = useLibrary();
  const pool = useMemo(() => cards.filter(card => (!courseId || card.courseId === courseId) && (!unitId || card.unitId === unitId)), [cards, courseId, unitId]);
  const saved = useMemo(() => state.learnSession?.key === sessionKey
    ? reconcileLearn(state.learnSession, pool) : undefined, [state.learnSession, sessionKey, pool]);
  const [draft, setDraft] = useState(() => saved ?? startLearn(pool, sessionKey));
  const [settings, setSettings] = useState(!saved);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [override, setOverride] = useState(false);
  const [retype, setRetype] = useState("");
  const [round, setRound] = useState(false);
  const [music, setMusic] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [sounds, setSounds] = useState(false);
  useEffect(() => { if (music) return startFocusMusic(volume); }, [music, volume]);
  useEffect(() => () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  const session = saved ?? draft;
  const current = useMemo(() => question(session, pool), [session, pool]);
  const masteredCount = session.progress.filter(item => item.mastered).length;
  const disabled = !writeReady || persistBlocked;
  const setupError = !draft.types.length ? "Choose at least one question type."
    : settings && pool.length && !question({ ...draft, queue: [pool[0]!.id] }, pool)
      ? draft.types.includes("fillBlank") && draft.direction === "definition"
        ? "Fill in the blank uses term answers. Choose Term or enable Typing."
        : "True / false needs at least two distinct answers. Enable Typing or Flashcards for this set."
      : null;
  const needsRetype = feedback === false && !override && session.retype
    && (current?.type === "written" || current?.type === "fillBlank");

  function resetQuestion() {
    setAnswer(""); setFeedback(null); setOverride(false); setRetype(""); setRevealed(false);
  }
  function speak(text: string) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  }
  function check(value: string) {
    if (disabled || feedback !== null || !value.trim()) return;
    setAnswer(value);
    const correct = grade(session, pool, value);
    setFeedback(correct);
    if (sounds) playLearnTone(correct);
  }
  function next() {
    if (disabled || feedback === null || (needsRetype && retype !== current?.answers[0])) return;
    const nextSession = submit(session, pool, answer, false, override);
    saveLearnSession(nextSession);
    setDraft(nextSession);
    resetQuestion();
    setRound(nextSession.attempts.length % session.roundSize === 0 && nextSession.queue.length > 0);
    if (session.audio) {
      const nextQuestion = question(nextSession, pool);
      if (nextQuestion) speak(nextQuestion.prompt);
    }
  }
  function begin() {
    if (disabled || setupError) return;
    const changed = saved && (saved.direction !== draft.direction || JSON.stringify(saved.types) !== JSON.stringify(draft.types));
    const base = changed ? startLearn(pool, sessionKey) : reconcileLearn(draft, pool);
    const nextSession = {
      ...base, types: draft.types, direction: draft.direction, smart: draft.smart,
      retype: draft.retype, audio: draft.audio, roundSize: draft.roundSize,
    };
    saveLearnSession(nextSession);
    setDraft(nextSession);
    resetQuestion();
    setRound(false);
    setSettings(false);
    if (nextSession.audio) {
      const first = question(nextSession, pool);
      if (first) speak(first.prompt);
    }
  }
  function openSettings(newCycle = false) {
    setDraft(newCycle ? { ...startLearn(pool, sessionKey), types: session.types, direction: session.direction,
      smart: session.smart, retype: session.retype, audio: session.audio, roundSize: session.roundSize } : session);
    resetQuestion();
    setRound(false);
    setSettings(true);
  }

  return <>
    <PageHeader title="Learn" lede="Practice with typing, blanks, or flashcards. Your review dates stay unchanged." />
    <div className="mb-5 flex flex-wrap items-center gap-4">
      <label><input type="checkbox" checked={music} onChange={event => setMusic(event.target.checked)} /> Focus music</label>
      <label>Music volume <input type="range" min="0" max="1" step="0.05" value={volume} onChange={event => setVolume(Number(event.target.value))} /></label>
      <label><input type="checkbox" checked={sounds} onChange={event => setSounds(event.target.checked)} /> Answer sounds</label>
    </div>
    {!pool.length ? <p>Add cards to this course or unit to begin.</p> : settings ?
      <section className="space-y-4 rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-bold">Set up your learning session</h2>
        <fieldset>
          <legend>Question types</legend>
          {types.map(type => <label key={type} className="mr-4 inline-flex gap-2">
            <input type="checkbox" checked={draft.types.includes(type)} onChange={event => setDraft({ ...draft,
              types: event.target.checked ? [...draft.types, type] : draft.types.filter(item => item !== type) })} />
            {labels[type]}
          </label>)}
        </fieldset>
        <label className="block">Answer with <select value={draft.direction} onChange={event => setDraft({ ...draft, direction: event.target.value as LearnSession["direction"] })}>
          <option value="term">Term</option><option value="definition">Definition</option>
        </select></label>
        {(["smart", "retype", "audio"] as const).map(key => <label key={key} className="block">
          <input type="checkbox" checked={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.checked })} />
          {key === "smart" ? "Smart grading (aliases and conservative typo tolerance)" : key === "retype" ? "Retype missed written answers" : "Read prompts aloud"}
        </label>)}
        <label className="block">Questions per round <input type="number" min="1" max="30" value={draft.roundSize}
          onChange={event => setDraft({ ...draft, roundSize: Math.max(1, Math.min(30, Number(event.target.value) || 7)) })} /></label>
        <p className="text-sm text-muted">Selected input formats start immediately and alternate as each card returns. Flashcards are optional. Changing direction or question types starts a fresh learning cycle. Exact grading accepts only the saved answer or explicit aliases.</p>
        <p className="text-sm text-muted">Fill in the blank uses term answers and a saved prompt, or a blank derived from the card definition. Definition direction uses Typing.</p>
        {setupError ? <p role="alert" className="text-sm text-danger">{setupError}</p> : null}
        <Button disabled={disabled || !!setupError} onClick={begin}>Start learning</Button>
      </section> : <section className="space-y-5">
        <StudyCompanion pose={!session.queue.length ? "success" : feedback || override ? "happy" : "studying"} equipped={state.miso.equipped} />
        <p aria-live="polite">{masteredCount} of {session.progress.length} {session.types.every(type => type === "flashcard") ? "self-assessed" : session.types.some(type => type === "written" || type === "fillBlank") ? "mastered" : "recognition mastered"} · {session.attempts.length} questions answered</p>
        <progress aria-label="Learning progress" className="w-full" value={masteredCount} max={session.progress.length} />
        {!session.queue.length ? <div className="space-y-4">
          <h2 className="text-xl font-bold">Learning cycle complete</h2>
          <p>Keep using scheduled reviews to retain what you learned.</p>
          <ButtonLink to="/study">Review due cards</ButtonLink>
        </div> : round ? <div className="space-y-4">
          <h2 className="text-xl font-bold">Round complete</h2>
          <p>{session.attempts.slice(-session.roundSize).filter(attempt => attempt.correct).length} correct this round. {session.progress.filter(item => item.mistakes > 0 && !item.mastered).length} terms need more practice.</p>
          <ul>{session.progress.filter(item => item.mistakes > 0 && !item.mastered).map(item => <li key={item.id}>{pool.find(card => card.id === item.id)?.term}</li>)}</ul>
          <Button onClick={() => setRound(false)}>Continue learning</Button>
        </div> : current ? <div key={session.questionId} className="space-y-4 rounded-2xl border border-line bg-white p-6">
          <p className="text-sm text-muted">{labels[current.type]} · {session.progress.find(item => item.id === current.card.id)?.seen ? "Learning" : "New"}</p>
          <h2 className="whitespace-pre-wrap text-xl font-bold">{current.prompt}</h2>
          <button type="button" className="underline" onClick={() => speak(current.prompt)}>Read aloud</button>
          {feedback === null ? current.type === "flashcard" ? <div className="space-y-3">
            {revealed ? <><p>{current.answers[0]}</p>
              <Button disabled={disabled} onClick={() => check("remembered")}>I remembered</Button>{" "}
              <Button disabled={disabled} onClick={() => check("missed")}>Study again</Button>
            </> : <Button disabled={disabled} onClick={() => setRevealed(true)}>Reveal answer</Button>}
          </div> : current.type === "trueFalse" ? <>
            <p>{current.pairing}</p>
            <Button disabled={disabled} onClick={() => check("true")}>True</Button>{" "}
            <Button disabled={disabled} onClick={() => check("false")}>False</Button>
          </> : <form onSubmit={event => { event.preventDefault(); check(answer); }} className="space-y-3">
            <TextField label="Your answer" autoFocus autoComplete="off" autoCapitalize="none" spellCheck={false}
              value={answer} disabled={disabled} onChange={event => setAnswer(event.target.value)} />
            <Button type="submit" disabled={disabled || !answer.trim()}>Check answer</Button>
          </form> : <form onSubmit={event => { event.preventDefault(); next(); }} className="space-y-3">
            <div aria-live="polite"><p className="font-bold">{feedback || override ? "Correct" : "Not quite"}</p><p>Expected answer: {current.answers[0]}</p></div>
            {!feedback && !override && (current.type === "written" || current.type === "fillBlank") ?
              <Button disabled={disabled} variant="secondary" onClick={() => setOverride(true)}>Mark my answer correct</Button> : null}
            {needsRetype ? <TextField label="Retype the correct answer" autoFocus autoComplete="off" value={retype}
              disabled={disabled} onChange={event => setRetype(event.target.value)} /> : null}
            <Button type="submit" disabled={disabled || (needsRetype && retype !== current.answers[0])}>Continue</Button>
          </form>}
        </div> : <p>These cards cannot use the selected formats. Enable Typing or Flashcards in Settings.</p>}
        <div className="flex flex-wrap gap-4">
          <Button variant="secondary" onClick={() => openSettings()}>Settings</Button>
          <ButtonLink to="/" variant="secondary">Save and exit</ButtonLink>
          <Button variant="secondary" onClick={() => openSettings(true)}>New learning cycle</Button>
        </div>
        <p className="text-sm text-muted">Progress saves after Continue. Retyping is corrective practice and does not add mastery credit. Small sets may repeat questions sooner.</p>
      </section>}
  </>;
}
