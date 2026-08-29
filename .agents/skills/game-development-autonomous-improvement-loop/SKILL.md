---
name: game-development-autonomous-improvement-loop
description: Instructions describing how to run a long autonomous session with the goal of continuously improving the game with many attempts.
---

# Game development autonomous improvement loop
The following are the instructions describing how to run a long autonomous session with the goal of continuously improving the game with many attempts.

Follow these instructions for the current task.

## QA

The instructions are structured as a list of question answers. You are expected to follow the answers as the minimum baseline.

### What effort level is expected from the agent working on the task?
The highest level possible. The agent should never spare its own resources in the attempt to finish the work faster. If there is anything that can be done better, it should be attempted. Before finishing any work, the question should be asked: "Is it possible to do better?" If the answer is yes, continue iterating. This is most relevant in cases where the task involves creative work. The agent should make the strongest attempt to progressively try to improve the artistic side of the goal. Do not assume that the current quality bar is satisfactory, make your work better than everything else made so far. The bar should be the limits of your abilities, not the current state of the project.

### What does the improvement loop look like? What sequence of actions is expected when working on the task?
Before starting any work, fork into a separate branch.
- Write an iteration statement starting with "STARTING ITERATION n." Follow it with the description of the goals planned for this iteration.
- Proceed with the development. Make your best possible attempt.
- Do a thorough quality check and test the changes.
- If the result satisfies the task – commit the changes. Include the iteration number into the commit message.
- When iterating over the previous attempt, compare it with the previous work. If the attempt is not good, you can revert it back. You can even try doing it again if you think it can get better next time.
- Write a statement describing the iteration results starting with "ITERATION n FINISHED.". Follow it with the description. Was it applied or was it discarded? What was done during this iteration?
- Do the analysis on what can be improved in the work that you just did. It can include additional changes or involve redoing some work you just did from scratch. Do it yourself and run two subagents, one with the task of reviewing you work and one with the task of searching for further improvements.
- If you see any path for progression, start the next iteration. This forms a progression loop. Continue repeating the process starting from the first step "Write an iteration statement...".
- Finish when you don't see any way to improve the work further, or you cannot make it better.

### Which directions can the agent explore when looking for the ways to iteratively improve the progress on the creative task?
Everything that can be considered to be more creative, to have a higher artistic value, and bring more joy and aesthetic value to the audience. The general categories are the visuals, the sound, and the gameplay.
Examples of exploring the improvements:
- Attempting to deliver better models. Higher quality, more details, better style match. Animations play a huge role. More animation frames and more variations make for a richer experience.
- Artistic and creative GUI. Custom graphics and interesting visualizations play a huge role. Give the GUI a character, and move away from the repetitive software-like boxes and panels. The GUI should look like an artwork on its own.
- Deep gameplay mechanics that reflect the overall setting, immersing the player deeper into the game and giving them a feeling that they could break the defined limits.
- A wide variety of sound effect coverage where each action has multiple unique sounds created exclusively for it.

### What quality bar is expected when doing the quality check after every iteration?
The highest level possible. Make sure the mechanics are interesting and are working correctly. Put the highest effort into the visual verification. Use all of your tools available to screenshot the game in different states and look for edge cases. Make sure everything is rendered properly without artifacts. Be critical and nitpicky to ensure the highest visual quality.

### When is the agent expected to finish?
The loose definition is the point where you cannot improve anything anymore.
Some indicators of bad decision-making:
- No iteration attempts. Finishing the work after the very first iteration is a sign of not putting enough effort and not attempting any improvements. Two iterations is better but still not a good sign. A good minimum is attempting at least three iterations before finishing the work.
- Weak testing. Finishing the work without solid testing and an extensive visual check is the opposite of what is expected.
- The progress is not forked into the new branch, or no commits are created during iterations. You are expected to follow the improvement loop as described in the corresponding section.

### What is the bare minimum that should always be met?
Consult this cheatsheet to guard against rookie mistakes:
- Generated sprites have issues with the background not being well cut. Image generating model cannot generate transparent background, the sprites need to modify the generated assets to properly change the background into the transparent color. On top of that models can generate the fake transparent background, that looks like the grid that the image viewers usually show. This should be taken into account and handled explicitly. Prefer generating assets with solid background that is easier to replace and always verify that the background is properly cut everywhere. Among common mistake are also imperfect adges left from the bad quality background cut. Make sure the model edges properly transition into the transparent background. Another common mistake is the background being left uncut in the holes inside of the model.
- Incorrect atlas coordinates. It is common for the images in the generated atlas to be improperly aligned or for the grid itself to have a changing column or a row width. When working with the generated atlas assets, make sure that the grid is exactly as you expect it to be.
- Deformed GUI. Improper sizes, where some elements are too big or too small to have a nive aestetic look. The text is too small to be comfortably readable. The labels are trimmed and not fully readable. Important information with the game mechanics is hidden and not communicated well for the player to see. The alignment is not event. Elements overflow the normal position.
- Missing the sufficient visual or sound effects. Not have the proper high quality sprites or not even having any sprites at all. Using fonts or procedurally generated scribbles instead of the proper sprites. Not having enough frames in the sprite animations or having no animations at all. Animations that have less than 6 frames look very bad. Having no sound effect variation, reusing the same sound effect in multiple places or having no sound effects at all. Every action should have multiple sound effect variations generated.
