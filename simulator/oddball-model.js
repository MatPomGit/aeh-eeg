export function gaussian(x,mean,sd,amplitude){
 const z=(x-mean)/sd;
 return amplitude*Math.exp(-.5*z*z);
}

export function evokedPotential(timeSinceStimulus,target){
 if(timeSinceStimulus<0||timeSinceStimulus>1.15)return 0;
 const sensory=gaussian(timeSinceStimulus,.09,.022,-7)+gaussian(timeSinceStimulus,.17,.032,5);
 if(target){
  const n2=gaussian(timeSinceStimulus,.24,.042,-9);
  const p3=gaussian(timeSinceStimulus,.36,.072,24);
  return sensory+n2+p3;
 }
 return sensory+gaussian(timeSinceStimulus,.31,.06,4);
}

export function buildTrialSequence(count,targetProbability,random=Math.random){
 const n=Math.max(1,Math.floor(count));
 const targetCount=Math.max(1,Math.min(n-1,Math.round(n*targetProbability)));
 const sequence=Array.from({length:n},(_,i)=>i<targetCount);
 for(let i=sequence.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));
  [sequence[i],sequence[j]]=[sequence[j],sequence[i]];
 }
 return sequence;
}
