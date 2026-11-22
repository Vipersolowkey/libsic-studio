"""One-off cleaning of the pond picture: crops the video player's frame away and takes the passengers, the fishing rod
and the line out of the boat, so the empty boat can be the music player of the Clover Hill Meadow room.

Usage: python docs/art-tools/clover_remove_characters.py <original picture> docs/art-tools/clover_meadow_source.webp
(numpy, Pillow and opencv-python-headless needed). The result is the source picture of make_clover_meadow.py.
"""
import sys
import cv2, numpy as np
from PIL import Image, ImageDraw

ORIGINAL, OUT_PATH = sys.argv[1], sys.argv[2]
_orig = Image.open(ORIGINAL).convert('RGB')
# the video frame has a black edge on top and a player bar below: keep only the clean 16:9 picture
_base = _orig.crop((0, 8, 2976, 1682)).resize((1920, 1080), Image.LANCZOS)
im = np.asarray(_base)
import cv2, numpy as np
from PIL import Image, ImageDraw
H,W=im.shape[:2]
# 1) thin things: rod (column interpolation), string and bobber (row interpolation)
f0=im.astype(np.float32)
def rod_mask():
    m=Image.new('L',(W,H),0); d=ImageDraw.Draw(m)
    d.line([(728,690),(1110,858)],fill=255,width=44)
    d.polygon([(838,700),(884,722),(892,760),(846,752)],fill=255)  # stub
    mm=np.asarray(m).copy(); mm[843:,:]=0
    return mm
rm=rod_mask()
for x in range(760,1125):
    ys=np.where(rm[:,x]>0)[0]
    if len(ys)==0: continue
    ya,yb=ys.min()-3,ys.max()+3
    top=f0[ya-3:ya,x].mean(0); bot=f0[yb:yb+3,x].mean(0)
    t=np.linspace(0,1,yb-ya)[:,None]
    f0[ya:yb,x]=top*(1-t)+bot*t
sm=Image.new('L',(W,H),0); d=ImageDraw.Draw(sm)
d.rectangle((742,735,764,940),fill=255); d.ellipse((696,912,744,964),fill=255)
sm=np.asarray(sm)
for y in range(668,968):
    xs=np.where(sm[y]>0)[0]
    if len(xs)==0: continue
    xa,xb=xs.min()-3,xs.max()+3
    l=f0[y,xa-3:xa].mean(0); r=f0[y,xb:xb+3].mean(0)
    t=np.linspace(0,1,xb-xa)[:,None]
    f0[y,xa:xb]=l*(1-t)+r*t
im2=np.clip(f0,0,255).astype(np.uint8)
km=Image.new('L',(W,H),0); ImageDraw.Draw(km).polygon([(726,688),(741,679),(792,679),(792,740),(726,740)],fill=255)
im2=cv2.inpaint(im2,np.asarray(km),9,cv2.INPAINT_TELEA)
# 2) characters: lerp + mirrored detail
x0,x1,y0,y1=995,1458,610,843
f=im2.astype(np.float32)
Lc=f[y0:y1,955:993].mean(1)          # (rows,3)
Rc=f[y0:y1,1461:1499].mean(1)
n=x1-x0
tt=np.linspace(0,1,n)[None,:,None]
tt=tt*tt*(3-2*tt)
low=Lc[:,None,:]*(1-tt)+Rc[:,None,:]*tt
# detail from the right water, bounced
src_x0,src_x1=1461,1700
idx=[]
w=src_x1-src_x0
for i in range(n):
    k=i%(2*w); k=k if k<w else 2*w-1-k
    idx.append(src_x0+k)
src=f[y0:y1][:,idx]
blur=cv2.GaussianBlur(src,(0,0),14)
detail=src-blur
fill=low+detail*0.9
# also add some of the mean horizontal streaks of the source row (lowfreq of src row)
fill=np.clip(fill,0,255)
# 3) strip inside the boat
slice_=f[y0-0:y1+0]  # unused
out=im2.astype(np.float32)
msk=np.zeros((H,W),np.float32); msk[y0:y1,x0:x1]=1
msk=cv2.GaussianBlur(msk,(0,0),5)
# feather: shrink so that the blurred edge stays inside the box
box=np.zeros((H,W),np.float32); box[y0+8:y1,x0+8:x1-8]=1
box=cv2.GaussianBlur(box,(0,0),6)
full=out.copy(); full[y0:y1,x0:x1]=fill
out=out*(1-box[...,None])+full*box[...,None]
# boat inner strip: rows 836..867, x 1030..1455 from slice x 1000..1028
sy0,sy1=841,873
sl=out[sy0:sy1,1466:1490].mean(1)
for x in range(955,1462):
    wgt=min(1.0,(x-955)/24.0)
    out[sy0:sy1,x]=out[sy0:sy1,x]*(1-wgt)+sl*wgt
# soften seams on the strip ends
for xs in (1030,1455):
    pass
out=np.clip(out,0,255).astype(np.uint8)
Image.fromarray(out).save(OUT_PATH, 'WEBP', quality=94, method=5)
