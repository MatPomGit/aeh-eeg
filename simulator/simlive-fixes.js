const originalDrawImage=CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage=function(...args){
  if(this.canvas?.id==='simo')return;
  return originalDrawImage.apply(this,args);
};
