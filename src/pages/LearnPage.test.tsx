import { useState } from 'react';
import { render,screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe,it,expect,vi } from 'vitest';
import { LearnPage } from './LearnPage.tsx';
import { emptyAppState } from '../repositories/schema.ts';
import { startLearn } from '../features/study/learn.ts';
import { createInitialFsrsState } from '../services/scheduler/fsrsCard.ts';
const card={id:'card',courseId:'course',unitId:'unit',term:'Alpha',description:'First letter',acceptedAnswers:[],createdAt:'2026-01-01',updatedAt:'2026-01-01',fsrs:createInitialFsrsState(new Date())};
const saved=startLearn([card],JSON.stringify([null,null]));saved.types=['written'];saved.retype=true;
vi.mock('../features/library/useLibrary.ts',()=>({useLibrary:()=>{const [state,setState]=useState({...emptyAppState(),cards:[card],learnSession:saved});return {state,cards:state.cards,writeReady:true,persistBlocked:false,saveLearnSession:(learnSession:typeof saved)=>setState({...state,learnSession})};}}));
describe('Learn screen',()=>{it('handles mistake, corrective typing, retry, mastery and settings',async()=>{
 const user=userEvent.setup();render(<MemoryRouter><LearnPage/></MemoryRouter>);
 await user.type(screen.getByRole('textbox',{name:'Your answer'}),'wrong');await user.click(screen.getByRole('button',{name:'Check answer'}));expect(screen.getByText('Not quite')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Continue'})).toBeDisabled();
 await user.type(screen.getByRole('textbox',{name:'Retype the correct answer'}),'Alpha');await user.click(screen.getByRole('button',{name:'Continue'}));
 for(let i=0;i<2;i++){await user.type(screen.getByRole('textbox',{name:'Your answer'}),'Alpha');await user.click(screen.getByRole('button',{name:'Check answer'}));await user.click(screen.getByRole('button',{name:'Continue'}));}
 expect(screen.getByText('Learning cycle complete')).toBeInTheDocument();expect(screen.getByText(/1 of 1 mastered/)).toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Settings'}));expect(screen.getByText('Set up your learning session')).toBeInTheDocument();
});});

