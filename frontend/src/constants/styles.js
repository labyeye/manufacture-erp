
import { C } from "./colors";

export const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg};color:${C.text};font-family:'Syne',sans-serif;min-height:100vh}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:${C.bg}}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
  input,select,textarea{
    background:${C.inputBg};color:${C.text};border:1px solid ${C.border};
    border-radius:6px;padding:9px 12px;font-family:'Syne',sans-serif;font-size:13px;
    outline:none;width:100%;transition:border .2s;
  }
  input:focus,select:focus,textarea:focus{border-color:${C.accent}}
  select option{background:${C.surface}}
  button{cursor:pointer;font-family:'Syne',sans-serif}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  .fade{animation:fadeIn .25s ease}
`;
