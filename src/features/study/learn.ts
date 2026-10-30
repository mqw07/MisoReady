import { z } from 'zod';
import type { Flashcard } from '../../types/domain.ts';
import { matchAnswer } from '../../services/answerMatching/matchAnswer.ts';
import { normalizeAnswer } from '../../services/answerMatching/normalize.ts';
export const types = ['flashcard','multipleChoice','trueFalse','written','fillBlank'] as const;
export const learnSchema = z.object({ key:z.string(), types:z.array(z.enum(types)).min(1), direction:z.enum(['term','definition']), smart:z.boolean(), retype:z.boolean(), audio:z.boolean(), roundSize:z.number().int().min(1).max(30), queue:z.array(z.string()), progress:z.array(z.object({id:z.string(), fingerprint:z.string(), seen:z.boolean(), recognition:z.number(), recall:z.number(), mistakes:z.number(), mastered:z.boolean()})), questionId:z.string(), attempts:z.array(z.object({id:z.string(),cardId:z.string(),type:z.enum(types),answer:z.string(),correct:z.boolean(),hinted:z.boolean(),override:z.boolean(),at:z.string()})) });
export type LearnSession=z.infer<typeof learnSchema>;
export const fingerprint=(c:Flashcard)=>JSON.stringify([c.term,c.description,c.acceptedAnswers,c.fillBlank]);
export function startLearn(cards:Flashcard[],key:string):LearnSession {return {key,types:['flashcard','multipleChoice','written'],direction:'term',smart:true,retype:false,audio:false,roundSize:7,queue:cards.map(c=>c.id),progress:cards.map(c=>({id:c.id,fingerprint:fingerprint(c),seen:false,recognition:0,recall:0,mistakes:0,mastered:false})),questionId:crypto.randomUUID(),attempts:[]};}
export function reconcileLearn(s:LearnSession,cards:Flashcard[]):LearnSession {
 const valid=s.progress.filter(p=>cards.some(c=>c.id===p.id&&fingerprint(c)===p.fingerprint));
 const added=startLearn(cards.filter(c=>!valid.some(p=>p.id===c.id)),s.key);
 const queue=[...s.queue.filter(id=>valid.some(p=>p.id===id)),...added.queue];
 return {...s,progress:[...valid,...added.progress],queue,questionId:queue[0]===s.queue[0]?s.questionId:crypto.randomUUID()};
}
export function question(s:LearnSession,cards:Flashcard[]) {
 const card=cards.find(c=>c.id===s.queue[0]); const p=s.progress.find(p=>p.id===card?.id); if(!card||!p)return null;
 const answers=s.direction==='term'?[card.term,...card.acceptedAnswers]:[card.description];
 const alternatives=[...new Set(cards.filter(c=>c.id!==card.id).map(c=>s.direction==='term'?c.term:c.description))].filter(a=>!answers.some(b=>normalizeAnswer(a)===normalizeAnswer(b)));
 const eligible=s.types.filter(t=>(t!=='fillBlank'||(s.direction==='term'&&card.fillBlank))&&((t!=='multipleChoice'&&t!=='trueFalse')||alternatives.length>0));
 const recognition=eligible.filter(t=>t==='multipleChoice'||t==='trueFalse'); const recall=eligible.filter(t=>t==='written'||t==='fillBlank');
 const type: typeof types[number] | undefined=!p.seen&&eligible.includes('flashcard')?'flashcard':(p.recognition<2?recognition[s.attempts.length%Math.max(1,recognition.length)]:undefined)??recall[0]??recognition[0]??eligible[0]; if(!type)return null;
 const seed=[...s.questionId].reduce((n,c)=>n+c.charCodeAt(0),0); const options=[answers[0]!,...alternatives.slice(0,3)]; const offset=seed%options.length;
 const pairing=seed%2===0?answers[0]!:alternatives[0]!;
 return {card,type,prompt:type==='fillBlank'?card.fillBlank!.prompt:s.direction==='term'?card.description:card.term,answers:type==='fillBlank'?card.fillBlank!.acceptedAnswers:answers,choices:[...options.slice(offset),...options.slice(0,offset)],pairing,truth:pairing===answers[0]};
}
export function grade(s:LearnSession,cards:Flashcard[],answer:string){ const q=question(s,cards); if(!q)return false; if(q.type==='flashcard')return answer==='remembered'; if(q.type==='trueFalse')return answer===String(q.truth); return q.type==='multipleChoice'||!s.smart?q.answers.includes(answer):matchAnswer(answer,q.answers[0]!,q.answers.slice(1)).correct; }
export function submit(s:LearnSession,cards:Flashcard[],answer:string,hinted=false,override=false):LearnSession {
 const q=question(s,cards); if(!q)return s; const correct=override||grade(s,cards,answer);
 const progress=s.progress.map(p=>{if(p.id!==q.card.id)return p; const next={...p,seen:true}; const recall=q.type==='written'||q.type==='fillBlank'; if(!correct){next.mistakes++;if(recall)next.recall=0;else next.recognition=0;}else if(!hinted){if(recall)next.recall++;else if(q.type!=='flashcard')next.recognition++;}
 const hasRecall=s.types.some(t=>t==='written'||(t==='fillBlank'&&s.direction==='term'&&q.card.fillBlank)); next.mastered=hasRecall?next.recall>=2:s.types.every(t=>t==='flashcard')?correct:next.recognition>=2;return next;});
 const queue=s.queue.slice(1); if(!progress.find(p=>p.id===q.card.id)!.mastered)queue.splice(correct?queue.length:Math.min(2,queue.length),0,q.card.id);
 return {...s,progress,queue,questionId:crypto.randomUUID(),attempts:[...s.attempts,{id:s.questionId,cardId:q.card.id,type:q.type,answer,correct,hinted,override,at:new Date().toISOString()}]};
}
