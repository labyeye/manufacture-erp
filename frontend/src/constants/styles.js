import { C } from "./colors";

export const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&family=Fira+Code:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    background:linear-gradient(135deg,#07070f 0%,#0c0c1a 50%,#09090e 100%);
    background-attachment:fixed;
    color:${C.text};
    font-family:'Poppins',sans-serif;
    min-height:100vh;
    -webkit-font-smoothing:antialiased;
    letter-spacing:-0.01em;
  }
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);border-radius:4px}
  input,select,textarea{
    background:rgba(255,255,255,0.05);
    backdrop-filter:blur(8px);
    -webkit-backdrop-filter:blur(8px);
    color:${C.text};
    border:1px solid rgba(255,255,255,0.3);
    border-radius:10px;
    padding:9px 12px;
    font-family:'Poppins',sans-serif;
    font-size:13px;
    outline:none;
    width:100%;
    transition:border .2s,box-shadow .2s,background .2s;
  }
  input::placeholder,textarea::placeholder{color:${C.placeholder};font-style:italic;font-weight:300}
  input:focus,select:focus,textarea:focus{
    border-color:rgba(99,102,241,0.6);
    box-shadow:0 0 0 3px rgba(99,102,241,0.15),inset 0 1px 0 rgba(255,255,255,0.3);
    background:rgba(255,255,255,0.08);
  }
  select option{background:#0d0d1a;color:#e2e8f0}
  button{cursor:pointer;font-family:'Poppins',sans-serif}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  .fade{animation:fadeIn .22s ease}
  @media(max-width:767px){
    input,select,textarea{font-size:16px}
    table{min-width:600px}
  }
`;
