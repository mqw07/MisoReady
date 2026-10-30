/** Quiet, original synthesized tones; no remote media or audio downloads. */
export function playLearnTone(correct:boolean) {
 if(!('AudioContext' in window))return;
 const context=new AudioContext(); const oscillator=context.createOscillator(); const gain=context.createGain();
 oscillator.frequency.value=correct?660:220;gain.gain.setValueAtTime(0.035,context.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,context.currentTime+0.2);oscillator.connect(gain).connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+0.2);oscillator.onended=()=>{void context.close();};
}
export function startFocusMusic(volume:number) {
 if(!('AudioContext' in window))return ()=>{};
 const context=new AudioContext();const gain=context.createGain();gain.gain.value=volume*0.08;gain.connect(context.destination);
 const notes=[261.63,329.63,392,523.25,392,329.63,293.66,392];let step=0;
 const play=()=>{const oscillator=context.createOscillator();const envelope=context.createGain();oscillator.type='sine';oscillator.frequency.value=notes[step++%notes.length]!;envelope.gain.setValueAtTime(0,context.currentTime);envelope.gain.linearRampToValueAtTime(0.5,context.currentTime+0.3);envelope.gain.exponentialRampToValueAtTime(0.001,context.currentTime+2.5);oscillator.connect(envelope).connect(gain);oscillator.start();oscillator.stop(context.currentTime+2.6);};
 play();const timer=window.setInterval(play,1800);return ()=>{window.clearInterval(timer);void context.close();};
}
