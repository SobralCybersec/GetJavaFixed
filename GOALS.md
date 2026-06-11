## GOALS:

1- we're moving  the buttons of auto-commit, auto-push and auto-refactor to the bottom bar, with a simple icon to open the menu that you can change the toggles.

2- Toggle Sidebar, zen mode, split terminal and compact menu is moving to the right side.

3- we're removing the proxy preset recovery in the menu front-end, we don't need that, we only used that as place holder.

4- we're making the open workspace instead being an folder icon, just like we used the icons with hugeicons.

5- we're removing the research mcps tab in the dashboard.

6- We're making an first time tutorial with a "?" icon using hugeicons so you can click and check it again, will be a simple slideshow that has animations when you go foward/backwards.

7- The agents will change per theme, as well their personality will match the anime, as well each one will have an selected icon of hugeicons, and when you hover the color should change as well matching their own colors.

8- We're making my idea is to edit the "CCG" and 
add a GIF of a character instead, I will provide the gifs, the gifs will be for each agent character that has loaded.

9- We're making the openai discovered models auto-redirect to their settings, like having deepseek-v4-pro redirect to the deepseek-v4-pro, as well we're adding the thinking versions btw, since we have deepseek-v4-pro-thinking and deepseek-v4-flash-thinking. We're adding qwen provider too, kimi, and other's we're missing, matching their own icons. As well the auto-match should work for every proxy model we discover. Like kimi often is  k2-d6 and k2d6-thinking, qwen3.7-max qwen-3.6-plus, qwen-3.6-plus-thinking etc. So it matches their context size, etecetera.

10- We're also adding the open workspace to top bar instead of inside the dashboard, with the folder icon of hugeicons, so the user can check better and without issues.

11- The font of the big "name of project" and "refactor code" should change to BebasNeue , does not match our terminal aesthetic, as well we should have layout options, now it's only one, we can make bigger decisions with a better layout design, of course the user should change in first time using tutorial slideshow.

12- The settings will be the big front-end changes, the layout should be changed and compact it.


13- The translations are missing for dashboard, other references, we're making full translations.

14- We're adding a new feature/ as well fixing the split not working, we're integrating ani-cli (research about it)  [pystardust/ani-cli](https://github.com/pystardust/ani-cli)to download so we can watch anime and should be of course that you can split and make an separated window if you wan't.

15- The cybersecurity agents should be an mode that you toggle in the ui of the agents selection, instead of making alot of agents visually, so only display the useful agents for this context and swap with the others.

16- So maybe everyone could have a notepad with a icon of huge icons where you can save the most important information,
A small, subtle button/hugeicon that looks like a notepad or sticky note, and when you click it, it expands to show more information.
I also think it would be interesting to have a search bar that pulls up everything from all the people you’ve chatted with. For example: “Katsu eating a lot”—then related keywords would appear.
We can make an big dashboard of context, so we can check what we made, the relatory saved, etc.
So that will will be an place for more the things you did with agents.

17-  The agents should have separated instructions, like the cybersecurity should have separated instructions folder, of course you should be able to add, so two folders, that will also make them not load alot of heavy resources markdowns. Change the chat title for agents whenever you want, but keep the agents' names by default. Or even add a subtitle indicating the task they're currently performing.
Ex: “Jin-Woo (title) Daily Training (subtitle below)” 

18- Buttons to lower, raise, deepen, or lighten the sound effects.

19 - That’s something for the future, and I’m not sure if it would be that interesting, so it’s just a casual suggestion. And if at some point the user ends up using that agent for another
purpose, and the agent says something like, “I’m not familiar with this topic, but I can bring in Agent X for this conversation. Would you like to start a new
conversation with the agents?”
And that way, it would create a “team” that gathers the information in one place, instead of jumping from one agent to another. 
Plus, maybe a message would pop up like, “Do you want Agent X to explain the context to Agent X?” kind of like passing on the information, 
instead of “starting from scratch” by explaining and setting everything up again for another agent. The other agent would send the project history.

20- The zen mode is kinda junky, need to fix that.

Check our code and diagnose issues, refactor what need to be refactored, deep research with exa mcp, and research some gaps, and performance issues. 

Make the changes Following the Principles of YAGNI, DRY, KISS, Clean Code of course, making tests and fixing behavior.

First check our stack to understand what we're making, second DO not make an change without checking all the files about it.

Always using RTK and caveman full.