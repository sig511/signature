const profile={
  name:'전진용',
  organization:'시그니처 행정사사무소',
  title:'대표 행정사',
  mobile:'01077755116',
  office:'050713805116',
  email:'SIG511@naver.com',
  address:'서울시 구로구 디지털로 288, 대륭포스트타워 1차 208호',
  website:'https://sig511.github.io/signature/'
};
const toast=document.querySelector('.toast');
function notify(message){toast.textContent=message;toast.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('show'),1800)}
async function copyText(text,message){try{await navigator.clipboard.writeText(text);notify(message)}catch{const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();document.execCommand('copy');area.remove();notify(message)}}
if(/Android/i.test(navigator.userAgent)){
  const encode=value=>encodeURIComponent(value);
  const fallback=encode(new URL('./jun-jin-yong.vcf',location.href).href);
  const contactIntent=`intent://contacts/people/#Intent;scheme=content;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/contact;S.name=${encode(profile.name)};S.phone=${encode(profile.mobile)};S.secondary_phone=${encode(profile.office)};S.email=${encode(profile.email)};S.company=${encode(profile.organization)};S.job_title=${encode(profile.title)};S.browser_fallback_url=${fallback};end`;
  document.querySelectorAll('[data-contact-link]').forEach(link=>link.href=contactIntent);
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

const scrollTopButton=document.querySelector('.scroll-top');
const updateScrollTopButton=()=>scrollTopButton.classList.toggle('show',window.scrollY>320);
window.addEventListener('scroll',updateScrollTopButton,{passive:true});
scrollTopButton.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
updateScrollTopButton();
