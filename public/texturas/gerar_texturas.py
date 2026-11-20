import numpy as np
from PIL import Image, ImageFilter
N=512
rng=np.random.default_rng(7)
def banda(f0,f1,seed):
    r=np.random.default_rng(seed); w=r.standard_normal((N,N))
    F=np.fft.fft2(w); fy=np.fft.fftfreq(N)[:,None]*N; fx=np.fft.fftfreq(N)[None,:]*N; f=np.sqrt(fx**2+fy**2)
    m=((f>=f0)&(f<f1)).astype(float); o=np.real(np.fft.ifft2(F*m)); o-=o.mean(); return o/(o.std()+1e-9)
def fbm(oct,seed,base=2,ganho=.55):
    s=np.zeros((N,N)); a=1; t=0
    for i in range(oct):
        f=base*2**i; s+=a*banda(f,f*2,seed+i); t+=a; a*=ganho
    return s/t
def norm(x): x=x-x.min(); return x/(x.max()+1e-9)
def voronoi(n,seed,jit=1.0):
    r=np.random.default_rng(seed); pts=r.random((n,2))*N
    yy,xx=np.mgrid[0:N,0:N].astype(float)
    d1=np.full((N,N),1e9); d2=np.full((N,N),1e9); idx=np.zeros((N,N),int)
    for i,(px,py) in enumerate(pts):
        dx=np.abs(xx-px); dx=np.minimum(dx,N-dx); dy=np.abs(yy-py); dy=np.minimum(dy,N-dy); d=np.sqrt(dx*dx+dy*dy)
        m=d<d1; d2=np.where(m,d1,np.minimum(d2,d)); idx=np.where(m,i,idx); d1=np.where(m,d,d1)
    return d1,d2,idx
def normal(h,forca):
    dx=(np.roll(h,-1,1)-np.roll(h,1,1))*forca; dy=(np.roll(h,-1,0)-np.roll(h,1,0))*forca
    n=np.dstack([-dx,dy,np.ones_like(h)]); n/=np.linalg.norm(n,axis=2,keepdims=True)
    return ((n*.5+.5)*255).astype(np.uint8)
def cor(*c): return np.array(c,float)/255
def misturar(a,b,t): t=t[...,None]; return a*(1-t)+b*t
def salvar(nome,alb,h,forca):
    Image.fromarray((np.clip(alb,0,1)*255).astype(np.uint8)).save(f'/tmp/tex/{nome}_cor.jpg',quality=88)
    Image.fromarray(normal(h,forca)).save(f'/tmp/tex/{nome}_nrm.jpg',quality=90)
# 0 grama
g1=fbm(6,10); g2=fbm(3,20,base=4); blades=banda(60,200,30)
h=norm(blades*0.6+g1*0.4)
base=misturar(cor(58,92,34)[None,None,:]*np.ones((N,N,3)), cor(104,138,52), norm(g2))
base=misturar(base, cor(34,58,22), np.clip(-blades*.5,0,1)*.8)
base=misturar(base, cor(140,150,70), np.clip(blades-1.2,0,1)*.6)
base=misturar(base, cor(92,72,44), np.clip(g1-1.0,0,1)*.7)
salvar('grama',base,h,3.0)
# 1 terra
f=fbm(7,40); d1,d2,_=voronoi(90,41); pedr=np.clip(1-d1/9,0,1)**1.2
h=norm(f*0.6+pedr*1.2)
base=misturar(cor(98,72,48)*np.ones((N,N,3)), cor(124,96,66), norm(fbm(4,42)))
base=misturar(base, cor(66,48,32), np.clip(-f,0,1)*.6)
base=misturar(base, cor(140,128,112), pedr*.75)
salvar('terra',base,h,4.0)
# 2 areia
f=fbm(6,50,base=8); rip=np.sin(np.linspace(0,2*np.pi*14,N)[None,:]+banda(2,6,51)*2.5)
h=norm(rip*0.12+f*0.88)
base=misturar(cor(196,166,112)*np.ones((N,N,3)), cor(222,196,146), norm(f))
base=misturar(base, cor(180,150,104), np.clip(-rip,0,1)*.08)
base=misturar(base, cor(150,130,100), np.clip(banda(80,250,52)-1.5,0,1))
salvar('areia',base,h,2.0)
# 3 rocha
f=fbm(7,60,base=2); camadas=np.sin(np.linspace(0,2*np.pi*6,N)[:,None]+fbm(3,61)*3)
d1,d2,_=voronoi(18,62); rach=np.clip(1-(d2-d1)/2.2,0,1)*np.clip(banda(3,12,64)+.6,0,1)
f2=fbm(6,65,base=6)
h=norm(f*0.8+f2*0.35+camadas*0.2-rach*0.5)
base=misturar(cor(98,92,84)*np.ones((N,N,3)), cor(156,148,134), norm(f+camadas*.3+f2*.4))
base=misturar(base, cor(60,56,52), rach*.55)
base=misturar(base, cor(96,108,70), np.clip(fbm(4,63,base=4)-1.1,0,1)*.6)
salvar('rocha',base,h,6.0)
# 4 calçamento (pedras arredondadas)
d1,d2,idx=voronoi(70,70); borda=d2-d1
pedra=np.clip(borda/8,0,1)**.6
r=np.random.default_rng(71); tons=r.random(70)
f=fbm(5,72,base=8)
h=norm(pedra*1.0+f*0.15)
c1=cor(128,122,112); c2=cor(168,160,146); base=misturar(c1*np.ones((N,N,3)),c2,tons[idx])
base=misturar(base, base*0.85, norm(f))
base=misturar(cor(70,62,52)*np.ones((N,N,3)), base, np.clip(borda/3,0,1))
salvar('calcada',base,h,5.0)
# 5 tábuas
yy=np.arange(N)[:,None]*np.ones((1,N)); tab=N/6
linha=(yy%tab); fenda=np.clip(1-np.minimum(linha,tab-linha)/3,0,1)
r=np.random.default_rng(80); veio=np.sin((np.arange(N)[None,:]/N*2*np.pi*3)+banda(1,4,81)*4+ (yy//tab)*1.7)*0.5+banda(20,80,82)*0.3
tom=r.random(6)[(yy//tab).astype(int)%6]
h=norm(-fenda*1.5+veio*0.2)
base=misturar(cor(118,80,48)*np.ones((N,N,3)), cor(150,108,66), tom)
base=misturar(base, cor(90,58,34), norm(veio)*.5)
base=misturar(base, cor(40,26,16), fenda*.9)
salvar('tabuas',base,h,4.0)
# 6 vidro negro
d1,d2,idx=voronoi(25,90); aresta=np.clip(1-(d2-d1)/3,0,1)
f=fbm(5,91)
h=norm(-aresta+f*0.2)
base=misturar(cor(18,16,24)*np.ones((N,N,3)), cor(36,32,48), norm(f))
base=misturar(base, cor(110,100,140), aresta*.5)
salvar('vidro',base,h,3.0)
# 7 chão de floresta (terra + folhas secas)
f=fbm(6,100); d1,d2,idx=voronoi(160,101); folha=np.clip(1-d1/10,0,1)
r=np.random.default_rng(102); tf=r.random(400)[idx]
h=norm(f*0.5+folha*0.8)
base=misturar(cor(72,56,38)*np.ones((N,N,3)), cor(96,76,50), norm(f))
cf=misturar(cor(150,96,40)*np.ones((N,N,3)), cor(110,120,50), tf)
base=misturar(base, cf, (folha>0.15)*(tf>0.25)*.85)
salvar('floresta',base,h,3.5)
print('ok')
