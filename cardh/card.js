const profile={
  name:'전진용',
  organization:'시그니처 행정사사무소',
  title:'대표 행정사',
  mobile:'050713805116',
  office:'050713805116',
  email:'SIG511@naver.com',
  address:'서울시 구로구 디지털로 288, 대륭포스트타워 1차 208호',
  website:'https://sig511.github.io/signature'
};
const toast=document.querySelector('.toast');
function notify(message){toast.textContent=message;toast.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('show'),1800)}
async function copyText(text,message){try{await navigator.clipboard.writeText(text);notify(message)}catch{const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();document.execCommand('copy');area.remove();notify(message)}}
if(/Android/i.test(navigator.userAgent)){
  const encode=value=>encodeURIComponent(value);
  const fallback=encode(new URL('./jun-jin-yong.vcf',location.href).href);
  const contactIntent=`intent://contacts/people/#Intent;scheme=content;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/contact;S.name=${encode(profile.name)};S.phone=${encode(profile.mobile)};S.secondary_phone=${encode(profile.office)};S.email=${encode(profile.email)};S.company=${encode(profile.organization)};S.job_title=${encode(profile.title)};S.postal=${encode(profile.address)};S.postal_type=업무;S.website=${encode(profile.website)};S.notes=${encode(`홈페이지: ${profile.website}`)};S.browser_fallback_url=${fallback};end`;
  document.querySelectorAll('[data-contact-link]').forEach(link=>{
    link.href=contactIntent;
    link.addEventListener('click',event=>{
      event.preventDefault();
      location.href=contactIntent;
    });
  });
}
async function shareCard(){const data={title:'전진용 대표 행정사 | 시그니처 행정사사무소',text:'일반행정·공인번역·의료기기 컨설팅',url:location.href};if(navigator.share){try{await navigator.share(data)}catch(error){if(error.name!=='AbortError')copyText(location.href,'명함 주소를 복사했습니다')}}else{copyText(location.href,'명함 주소를 복사했습니다')}}
document.querySelectorAll('[data-action="share"]').forEach(button=>button.addEventListener('click',shareCard));
document.querySelector('[data-action="copy-link"]').addEventListener('click',()=>copyText(location.href,'명함 주소를 복사했습니다'));

// 이미지 저장 메뉴와 드래그 저장을 제한합니다.
document.addEventListener('contextmenu',event=>event.preventDefault());
document.querySelectorAll('img').forEach(image=>{
  image.draggable=false;
  image.addEventListener('dragstart',event=>event.preventDefault());
});

const scroller=document.querySelector('.card-shell');
const panels=[...document.querySelectorAll('.horizontal-panel')];
const previousButton=document.querySelector('.panel-prev');
const nextButton=document.querySelector('.panel-next');
const panelStatus=document.querySelector('.panel-status');
let activePanel=0;

function updatePanelStatus(){
  panelStatus.querySelector('strong').textContent=String(activePanel+1).padStart(2,'0');
  panelStatus.querySelector('span').textContent=`/ ${String(panels.length).padStart(2,'0')}`;
  panelStatus.querySelector('em').textContent=panels[activePanel].dataset.panelLabel;
  previousButton.disabled=activePanel===0;
  nextButton.disabled=activePanel===panels.length-1;
}

function moveToPanel(index){
  activePanel=Math.max(0,Math.min(panels.length-1,index));
  panels[activePanel].scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'});
  updatePanelStatus();
}

previousButton.addEventListener('click',()=>moveToPanel(activePanel-1));
nextButton.addEventListener('click',()=>moveToPanel(activePanel+1));
document.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft')moveToPanel(activePanel-1);
  if(event.key==='ArrowRight')moveToPanel(activePanel+1);
});

let scrollTimer;
scroller.addEventListener('scroll',()=>{
  clearTimeout(scrollTimer);
  scrollTimer=setTimeout(()=>{
    const center=scroller.scrollLeft+scroller.clientWidth/2;
    let closest=0;
    panels.forEach((panel,index)=>{
      const panelCenter=panel.offsetLeft+panel.offsetWidth/2;
      if(Math.abs(panelCenter-center)<Math.abs((panels[closest].offsetLeft+panels[closest].offsetWidth/2)-center))closest=index;
    });
    activePanel=closest;
    updatePanelStatus();
  },80);
},{passive:true});

scroller.addEventListener('wheel',event=>{
  if(Math.abs(event.deltaY)>Math.abs(event.deltaX)){
    event.preventDefault();
    scroller.scrollLeft+=event.deltaY;
  }
},{passive:false});

updatePanelStatus();
