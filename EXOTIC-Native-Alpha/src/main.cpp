#include <windows.h>
#include <gdiplus.h>
#include <shellapi.h>
#include <vector>
#include <string>
#include <cmath>
#include <algorithm>
#pragma comment(lib, "gdiplus.lib")

using namespace Gdiplus;

static const COLORREF BLACK = RGB(17,17,17);
static const COLORREF WHITE = RGB(250,250,247);
static const COLORREF PINK = RGB(244,173,210);
static const COLORREF BLUE = RGB(158,216,246);
static const COLORREF YELLOW = RGB(244,239,115);
static const COLORREF GREEN = RGB(121,215,146);
static const COLORREF PANEL = RGB(255,255,255);

struct Particle { float x,y,vx,vy; COLORREF color; };
std::vector<Particle> particles;
int tickCount = 0;
HWND hwndMain = nullptr;
HFONT fontLarge, fontTitle, fontBody, fontSmall, fontBold;

void FillRoundRect(HDC hdc, RECT r, int radius, COLORREF fill, COLORREF border=BLACK, int bw=2){
    HBRUSH b=CreateSolidBrush(fill); HPEN p=CreatePen(PS_SOLID,bw,border);
    auto ob=SelectObject(hdc,b); auto op=SelectObject(hdc,p);
    RoundRect(hdc,r.left,r.top,r.right,r.bottom,radius,radius);
    SelectObject(hdc,ob); SelectObject(hdc,op); DeleteObject(b); DeleteObject(p);
}
void Text(HDC hdc,const std::wstring& s,int x,int y,HFONT f,COLORREF c=BLACK){
    SetBkMode(hdc,TRANSPARENT); SetTextColor(hdc,c); auto o=SelectObject(hdc,f); TextOutW(hdc,x,y,s.c_str(),(int)s.size()); SelectObject(hdc,o);
}
void DrawMetric(HDC hdc,int x,int y,int w,int h,COLORREF accent,const wchar_t* title,const wchar_t* value,const wchar_t* note){
    RECT shadow{x+4,y+4,x+w+4,y+h+4}; FillRoundRect(hdc,shadow,16,BLACK,BLACK,1);
    RECT r{x,y,x+w,y+h}; FillRoundRect(hdc,r,16,PANEL);
    RECT bar{x,y,x+9,y+h}; HBRUSH b=CreateSolidBrush(accent); FillRect(hdc,&bar,b); DeleteObject(b);
    Text(hdc,title,x+20,y+16,fontBold,RGB(90,90,90));
    Text(hdc,value,x+20,y+48,fontLarge);
    Text(hdc,note,x+20,y+h-28,fontSmall,RGB(100,100,100));
}
void DrawProject(HDC hdc,int x,int y,int w,const wchar_t* name,const wchar_t* state,int pct,COLORREF accent){
    RECT r{x,y,x+w,y+58}; FillRoundRect(hdc,r,12,PANEL);
    RECT m{x+12,y+10,x+24,y+48}; FillRoundRect(hdc,m,6,accent);
    Text(hdc,name,x+36,y+11,fontBold); Text(hdc,state,x+36,y+33,fontSmall,RGB(100,100,100));
    int bx=x+w-210; RECT outer{bx,y+23,bx+145,y+34}; FillRoundRect(hdc,outer,8,WHITE);
    RECT inner{bx+2,y+25,bx+2+(141*pct/100),y+32}; HBRUSH b=CreateSolidBrush(BLACK); FillRect(hdc,&inner,b); DeleteObject(b);
    Text(hdc,std::to_wstring(pct)+L"%",x+w-50,y+20,fontSmall);
}
void DrawAgent(HDC hdc,int x,int y,int w,const wchar_t* initial,const wchar_t* name,const wchar_t* task,const wchar_t* state){
    RECT icon{x,y,x+38,y+38}; FillRoundRect(hdc,icon,10,BLUE);
    Text(hdc,initial,x+13,y+8,fontBold);
    Text(hdc,name,x+50,y,fontBold); Text(hdc,task,x+50,y+21,fontSmall,RGB(100,100,100));
    SIZE sz{}; auto o=SelectObject(hdc,fontSmall); GetTextExtentPoint32W(hdc,state,(int)wcslen(state),&sz); SelectObject(hdc,o);
    RECT pill{x+w-sz.cx-24,y+6,x+w,y+31}; FillRoundRect(hdc,pill,14,YELLOW);
    Text(hdc,state,pill.left+10,pill.top+5,fontSmall);
}
void InitParticles(int w,int h){
    particles.clear();
    COLORREF colors[]={PINK,BLUE,YELLOW,WHITE,RGB(220,70,70)};
    for(int i=0;i<700;i++){
        Particle p; p.x=(float)(rand()%w); p.y=(float)(rand()%h); p.vx=((rand()%200)-100)/80.0f; p.vy=((rand()%200)-100)/80.0f; p.color=colors[rand()%5]; particles.push_back(p);
    }
}
void DrawStartup(HDC hdc,int w,int h){
    HBRUSH bg=CreateSolidBrush(BLACK); RECT full{0,0,w,h}; FillRect(hdc,&full,bg); DeleteObject(bg);
    for(auto &p:particles){
        p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>w)p.vx*=-1; if(p.y<0||p.y>h)p.vy*=-1;
        HBRUSH b=CreateSolidBrush(p.color); RECT d{(int)p.x,(int)p.y,(int)p.x+3,(int)p.y+3}; FillRect(hdc,&d,b); DeleteObject(b);
    }
    if(tickCount>20){
        int alpha=std::min(255,(tickCount-20)*8); SetTextColor(hdc,RGB(alpha,alpha,alpha)); SetBkMode(hdc,TRANSPARENT);
        auto o=SelectObject(hdc,fontLarge); const wchar_t* t=L"EXOTIC"; SIZE s{}; GetTextExtentPoint32W(hdc,t,6,&s); TextOutW(hdc,(w-s.cx)/2,h/2-30,t,6); SelectObject(hdc,o);
    }
}
void DrawUI(HDC hdc,int w,int h){
    HBRUSH bg=CreateSolidBrush(WHITE); RECT full{0,0,w,h}; FillRect(hdc,&full,bg); DeleteObject(bg);
    // topbar
    RECT top{0,0,w,76}; HBRUSH wb=CreateSolidBrush(PANEL); FillRect(hdc,&top,wb); DeleteObject(wb); HPEN p=CreatePen(PS_SOLID,3,BLACK); auto op=SelectObject(hdc,p); MoveToEx(hdc,0,75,nullptr); LineTo(hdc,w,75); SelectObject(hdc,op); DeleteObject(p);
    RECT logo{20,14,68,62}; FillRoundRect(hdc,logo,12,PINK); Text(hdc,L"ER",31,28,fontBold);
    Text(hdc,L"EXOTIC",82,16,fontTitle); Text(hdc,L"PORTAL",83,46,fontSmall,RGB(80,80,80));
    RECT search{w/2-250,17,w/2+250,58}; FillRoundRect(hdc,search,12,RGB(247,247,244)); Text(hdc,L"Search everything or run a command",search.left+18,search.top+12,fontBody,RGB(100,100,100));
    RECT avatar{w-62,16,w-20,58}; FillRoundRect(hdc,avatar,42,YELLOW); Text(hdc,L"M",w-48,29,fontBold);
    // sidebar
    RECT side{0,76,230,h}; HBRUSH sb=CreateSolidBrush(PANEL); FillRect(hdc,&side,sb); DeleteObject(sb); p=CreatePen(PS_SOLID,3,BLACK); op=SelectObject(hdc,p); MoveToEx(hdc,229,76,nullptr); LineTo(hdc,229,h); SelectObject(hdc,op); DeleteObject(p);
    const wchar_t* nav[]={L"HOME",L"PROJECTS",L"AI AGENTS",L"WORKFLOWS",L"ACTIVITY",L"ANALYTICS",L"RESEARCH",L"TRUST",L"SETTINGS"};
    int ny=98; for(int i=0;i<9;i++){ RECT nr{14,ny,216,ny+42}; if(i==0) FillRoundRect(hdc,nr,10,PINK); Text(hdc,nav[i],32,ny+13,fontBold); ny+=49; }
    Text(hdc,L"●  PLATFORM HEALTHY",20,h-60,fontSmall,GREEN); Text(hdc,L"EXOTIC PLATFORM 0.4",20,h-36,fontSmall,RGB(100,100,100));
    // content
    int cx=258; Text(hdc,L"LIVE OPERATING WORKSPACE",cx,104,fontSmall,RGB(100,100,100)); Text(hdc,L"Good morning, Mingo.",cx,128,fontLarge); Text(hdc,L"Observe. Map. Predict. Align. Act. Measure. Learn.",cx,184,fontBody,RGB(85,85,85));
    int gap=14, mw=(w-cx-28-gap*3)/4, my=226; DrawMetric(hdc,cx,my,mw,124,PINK,L"Active Projects",L"14",L"+3 this month"); DrawMetric(hdc,cx+mw+gap,my,mw,124,BLUE,L"AI Agents",L"9",L"4 active now"); DrawMetric(hdc,cx+(mw+gap)*2,my,mw,124,YELLOW,L"Momentum",L"87%",L"+12% this week"); DrawMetric(hdc,cx+(mw+gap)*3,my,mw,124,GREEN,L"Build Health",L"98%",L"All systems stable");
    int py=370, leftW=(w-cx-42)*3/5, rightX=cx+leftW+14, rightW=w-rightX-28;
    RECT ps{cx+4,py+4,cx+leftW+4,py+310+4}; FillRoundRect(hdc,ps,16,BLACK,BLACK,1); RECT pr{cx,py,cx+leftW,py+310}; FillRoundRect(hdc,pr,16,PANEL); Text(hdc,L"WORKSPACE",cx+18,py+16,fontSmall,RGB(100,100,100)); Text(hdc,L"Projects",cx+18,py+37,fontTitle);
    DrawProject(hdc,cx+18,py+78,leftW-36,L"Exotic Portal",L"Building",78,PINK); DrawProject(hdc,cx+18,py+144,leftW-36,L"Continuity Engine",L"Architecture",52,BLUE); DrawProject(hdc,cx+18,py+210,leftW-36,L"MINGO Advertising OS",L"Prototype",41,YELLOW);
    RECT as{rightX+4,py+4,rightX+rightW+4,py+310+4}; FillRoundRect(hdc,as,16,BLACK,BLACK,1); RECT ar{rightX,py,rightX+rightW,py+310}; FillRoundRect(hdc,ar,16,PANEL); Text(hdc,L"INTELLIGENCE",rightX+18,py+16,fontSmall,RGB(100,100,100)); Text(hdc,L"AI Swarm",rightX+18,py+37,fontTitle);
    DrawAgent(hdc,rightX+18,py+82,rightW-36,L"A",L"Architect",L"Structuring Portal runtime",L"ACTIVE"); DrawAgent(hdc,rightX+18,py+140,rightW-36,L"B",L"Builder",L"Compiling native shell",L"ACTIVE"); DrawAgent(hdc,rightX+18,py+198,rightW-36,L"O",L"Observer",L"Tracking workspace state",L"WATCHING");
    RECT cmd{w-180,h-68,w-28,h-24}; FillRoundRect(hdc,cmd,14,BLACK,BLACK,2); Text(hdc,L">  PORTAL",w-157,h-55,fontBold,WHITE);
}
LRESULT CALLBACK WndProc(HWND hwnd,UINT msg,WPARAM wp,LPARAM lp){
    switch(msg){
    case WM_CREATE:{ RECT r; GetClientRect(hwnd,&r); InitParticles(r.right,r.bottom); SetTimer(hwnd,1,16,nullptr); return 0; }
    case WM_TIMER: tickCount++; InvalidateRect(hwnd,nullptr,FALSE); if(tickCount==95){ RECT r; GetClientRect(hwnd,&r); InitParticles(r.right,r.bottom);} return 0;
    case WM_ERASEBKGND: return 1;
    case WM_PAINT:{ PAINTSTRUCT ps; HDC hdc=BeginPaint(hwnd,&ps); RECT r; GetClientRect(hwnd,&r); HDC mem=CreateCompatibleDC(hdc); HBITMAP bmp=CreateCompatibleBitmap(hdc,r.right,r.bottom); auto old=SelectObject(mem,bmp); if(tickCount<95) DrawStartup(mem,r.right,r.bottom); else DrawUI(mem,r.right,r.bottom); BitBlt(hdc,0,0,r.right,r.bottom,mem,0,0,SRCCOPY); SelectObject(mem,old); DeleteObject(bmp); DeleteDC(mem); EndPaint(hwnd,&ps); return 0; }
    case WM_KEYDOWN: if(wp==VK_ESCAPE) PostMessage(hwnd,WM_CLOSE,0,0); return 0;
    case WM_DESTROY: KillTimer(hwnd,1); PostQuitMessage(0); return 0;
    }
    return DefWindowProc(hwnd,msg,wp,lp);
}
int WINAPI wWinMain(HINSTANCE hInst,HINSTANCE, PWSTR, int){
    GdiplusStartupInput gdiplusStartupInput; ULONG_PTR gdiplusToken; GdiplusStartup(&gdiplusToken,&gdiplusStartupInput,nullptr);
    fontLarge=CreateFontW(44,0,0,0,FW_BLACK,FALSE,FALSE,FALSE,DEFAULT_CHARSET,OUT_DEFAULT_PRECIS,CLIP_DEFAULT_PRECIS,CLEARTYPE_QUALITY,DEFAULT_PITCH,L"Segoe UI");
    fontTitle=CreateFontW(24,0,0,0,FW_BOLD,FALSE,FALSE,FALSE,DEFAULT_CHARSET,OUT_DEFAULT_PRECIS,CLIP_DEFAULT_PRECIS,CLEARTYPE_QUALITY,DEFAULT_PITCH,L"Segoe UI");
    fontBody=CreateFontW(17,0,0,0,FW_NORMAL,FALSE,FALSE,FALSE,DEFAULT_CHARSET,OUT_DEFAULT_PRECIS,CLIP_DEFAULT_PRECIS,CLEARTYPE_QUALITY,DEFAULT_PITCH,L"Segoe UI");
    fontSmall=CreateFontW(12,0,0,0,FW_BOLD,FALSE,FALSE,FALSE,DEFAULT_CHARSET,OUT_DEFAULT_PRECIS,CLIP_DEFAULT_PRECIS,CLEARTYPE_QUALITY,DEFAULT_PITCH,L"Segoe UI");
    fontBold=CreateFontW(16,0,0,0,FW_BOLD,FALSE,FALSE,FALSE,DEFAULT_CHARSET,OUT_DEFAULT_PRECIS,CLIP_DEFAULT_PRECIS,CLEARTYPE_QUALITY,DEFAULT_PITCH,L"Segoe UI");
    WNDCLASSEXW wc{sizeof(wc)}; wc.lpfnWndProc=WndProc; wc.hInstance=hInst; wc.lpszClassName=L"EXOTIC_NATIVE"; wc.hCursor=LoadCursor(nullptr,IDC_ARROW); wc.hIcon=LoadIcon(hInst,MAKEINTRESOURCE(101)); wc.hIconSm=wc.hIcon; wc.style=CS_HREDRAW|CS_VREDRAW; RegisterClassExW(&wc);
    hwndMain=CreateWindowExW(0,wc.lpszClassName,L"EXOTIC",WS_OVERLAPPEDWINDOW,100,60,1500,920,nullptr,nullptr,hInst,nullptr); ShowWindow(hwndMain,SW_MAXIMIZE); UpdateWindow(hwndMain);
    MSG msg; while(GetMessageW(&msg,nullptr,0,0)){TranslateMessage(&msg);DispatchMessageW(&msg);} DeleteObject(fontLarge);DeleteObject(fontTitle);DeleteObject(fontBody);DeleteObject(fontSmall);DeleteObject(fontBold);GdiplusShutdown(gdiplusToken);return 0;
}
