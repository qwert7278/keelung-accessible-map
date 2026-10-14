import './home-story.css';
import {initStoryVideo} from './home-story';
import {initChatgptExample} from './chatgpt-onboarding';
import {initPublicMcp} from './public-mcp-onboarding';
initChatgptExample();
initPublicMcp();
const story=document.querySelector<HTMLElement>('[data-pov-story]');
if(story) initStoryVideo(story);
