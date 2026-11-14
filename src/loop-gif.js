// EX NIHILO PHASE 04F — no-dependency GIF89a encoder.
// Deterministic RGB332 palette, full frame disposal, Netscape infinite replay.
// This is an intentionally bounded mobile-safe GIF encoder, NOT PNG or MP4.
export class GifLoopWriter {
  constructor(width,height,fps=12){
    if(!Number.isInteger(width)||!Number.isInteger(height)||
      width<1||height<1||width>1024||height>1024)throw Error('Invalid GIF dimensions');
    if(!Number.isInteger(fps)||fps<1||fps>30)throw Error('Invalid GIF frame rate');
    this.width=width;this.height=height;this.fps=fps;this.frames=0;
    this.bytes=[];const put=(...values)=>this.bytes.push(...values);
    const word=n=>put(n&255,(n>>8)&255);
    for(const c of 'GIF89a')put(c.charCodeAt(0));
    word(width);word(height);put(0xf7,0,0);
    // One global deterministic RGB332 color table. GIF is 256-color;
    // 24-bit PNG output retains the full palette independently.
    for(let i=0;i<256;i++)put(
      Math.round(((i>>5)&7)*255/7),
      Math.round(((i>>2)&7)*255/7),
      Math.round((i&3)*255/3)
    );
    put(0x21,0xff,0x0b);
    for(const c of 'NETSCAPE2.0')put(c.charCodeAt(0));
    put(3,1,0,0,0);
  }
  addFrame(rgba,delayHundredths=null){
    if(!(rgba instanceof Uint8ClampedArray)||
      rgba.length!==this.width*this.height*4)
      throw Error('GIF frame dimensions differ');
    const bytes=this.bytes,word=n=>bytes.push(n&255,(n>>8)&255);
    const delay=delayHundredths===null?Math.max(2,Math.round(100/this.fps)):
      Math.max(2,Math.min(65535,Math.round(delayHundredths)));
    bytes.push(0x21,0xf9,0x04,0x04);
    word(delay);bytes.push(0,0);
    bytes.push(0x2c);
    word(0);word(0);word(this.width);word(this.height);
    bytes.push(0,8);
    const clear=256,end=257;
    let next=258,codeBits=9,bitBuffer=0,bitCount=0;
    const dictionary=new Map(),blocks=[];
    const emitCode=c=>{
      bitBuffer|=c<<bitCount;bitCount+=codeBits;
      while(bitCount>=8){blocks.push(bitBuffer&255);bitBuffer>>>=8;bitCount-=8;}
    };
    emitCode(clear);
    let prefix=-1;
    for(let i=0;i<rgba.length;i+=4){
      const color=((rgba[i]>>5)<<5)|((rgba[i+1]>>5)<<2)|(rgba[i+2]>>6);
      if(prefix<0){prefix=color;continue;}
      const key=prefix*256+color;
      if(dictionary.has(key)){prefix=dictionary.get(key);continue;}
      emitCode(prefix);
      if(next<4096){
        dictionary.set(key,next++);
        // LZW encoder dictionary advances one code ahead of decoder.
        // Increment AFTER crossing the power-of-two threshold, not at it.
        if(next>(1<<codeBits)&&codeBits<12)codeBits++;
      }else{
        emitCode(clear);
        dictionary.clear();next=258;codeBits=9;
      }
      prefix=color;
    }
    if(prefix>=0)emitCode(prefix);
    emitCode(end);
    if(bitCount>0)blocks.push(bitBuffer&255);
    for(let i=0;i<blocks.length;i+=255){
      const len=Math.min(255,blocks.length-i);
      bytes.push(len);
      for(let j=0;j<len;j++)bytes.push(blocks[i+j]);
    }
    bytes.push(0);
    this.frames++;
  }
  finish(){
    if(!this.frames)throw Error('No GIF frames to encode');
    return new Uint8Array([...this.bytes,0x3b]);
  }
}
