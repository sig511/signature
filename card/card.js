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
async function shareCard(){const data={title:'전진용 대표 행정사 | 시그니처 행정사사무소',text:'일반행정·공인번역·의료기기 컨설팅',url:location.href};if(navigator.share){try{await navigator.share(data)}catch(error){if(error.name!=='AbortError')copyText(location.href,'명함 주소를 복사했습니다')}}else{copyText(location.href,'명함 주소를 복사했습니다')}}
document.querySelectorAll('[data-action="share"]').forEach(button=>button.addEventListener('click',shareCard));
document.querySelector('[data-action="copy-link"]').addEventListener('click',()=>copyText(location.href,'명함 주소를 복사했습니다'));
