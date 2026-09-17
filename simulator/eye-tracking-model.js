export const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;

export function trimmedCenter(points,trim=.18){
 if(!points.length)return null;
 const center=key=>{const values=points.map(point=>point[key]).sort((a,b)=>a-b),cut=Math.min(Math.floor(values.length*trim),Math.floor((values.length-1)/2));return mean(values.slice(cut,values.length-cut))};
 return{x:center('x'),y:center('y')};
}

export function sampleSpread(points){
 const center=trimmedCenter(points,0);
 if(!center)return Infinity;
 return Math.sqrt(mean(points.map(point=>(point.x-center.x)**2+(point.y-center.y)**2)));
}

function solve3(A,b){
 const matrix=A.map((row,index)=>[...row,b[index]]);
 for(let column=0;column<3;column++){
  let pivot=column;
  for(let row=column+1;row<3;row++)if(Math.abs(matrix[row][column])>Math.abs(matrix[pivot][column]))pivot=row;
  [matrix[column],matrix[pivot]]=[matrix[pivot],matrix[column]];
  if(Math.abs(matrix[column][column])<1e-10)return null;
  const divisor=matrix[column][column];
  for(let i=column;i<4;i++)matrix[column][i]/=divisor;
  for(let row=0;row<3;row++){
   if(row===column)continue;
   const factor=matrix[row][column];
   for(let i=column;i<4;i++)matrix[row][i]-=factor*matrix[column][i];
  }
 }
 return[matrix[0][3],matrix[1][3],matrix[2][3]];
}

export function fitAffine(pairs,key){
 let s00=pairs.length,sx=0,sy=0,sxx=0,syy=0,sxy=0,b0=0,bx=0,by=0;
 for(const pair of pairs){const x=pair.raw.x,y=pair.raw.y,z=pair.target[key];sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y;b0+=z;bx+=x*z;by+=y*z}
 return solve3([[s00,sx,sy],[sx,sxx,sxy],[sy,sxy,syy]],[b0,bx,by]);
}

export function applyAffine(raw,mapX,mapY,clampValue=value=>Math.max(0,Math.min(1,value))){
 return{x:clampValue(mapX[0]+mapX[1]*raw.x+mapX[2]*raw.y),y:clampValue(mapY[0]+mapY[1]*raw.x+mapY[2]*raw.y)};
}

export function calibrationError(pairs,mapX,mapY){
 if(!pairs.length||!mapX||!mapY)return Infinity;
 return Math.sqrt(mean(pairs.map(pair=>{const mapped=applyAffine(pair.raw,mapX,mapY),dx=mapped.x-pair.target.x,dy=mapped.y-pair.target.y;return dx*dx+dy*dy})));
}
