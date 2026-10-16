import {initPublicMcp} from './public-mcp-onboarding';
import {initGuideCopies} from './mcp-guide';
initPublicMcp();
initGuideCopies();
const openSection=()=>{const section=document.getElementById(location.hash.slice(1));if(section?.tagName==='DETAILS')(section as HTMLDetailsElement).open=true;};
openSection();
window.addEventListener('hashchange',openSection);
