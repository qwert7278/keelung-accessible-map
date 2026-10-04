import './home-story.css';
import {initStoryVideo} from './home-story';
const story=document.querySelector<HTMLElement>('[data-pov-story]');
if(story) initStoryVideo(story);
