# Skills

- class: slack-agents
- chapter: 0 to 1
- title: Skills
- url: https://www.agenticcoding.school/v/FzwCATNG
- durationSeconds: 200
- fetched: 2026-09-05
- transcriptChars: 3574

## Description (video page text, NOT transcript; may contain links)

The prompt:
```
@"claude-code-guide (agent)" So, I made a brand new folder which is toolkit, and that contains skills that I want loaded into the sandbox every time. And these should be copied over to the .claude folder/slash skills inside of the home directory. Can you basically make that happen?
```

## Transcript

Okay, so in the last video, we had the .claud.md file synced

over to our sandbox as well. So whatever we write inside

of a .claud.md file will be the .claud.md file that runs on our

sandbox for pretty much any project. Now this is kind of like

you having your root level .claud.md file on your computer inside

of your .claud folder. So if I show the hidden folders over here,

the .claud folder over here, This is my user-level Claude empty file.

Now we also have user-level skills, which exist on my computer. And we

want to have skills that would run inside of our sandboxed agent,

no matter which project it's working in. So we basically need an equivalent

for .claude/skills. So what I like to do is I

like to make a brand new folder. So I'll make a brand new folder inside

of joestar and call it toolkit. And inside of this one,

I'm going to make another folder and then call it skills. So we will have

our skills inside of here. So one skill that I like to use is basically

a code-review skill. So I want this to exist inside of here.

And then also a task-lifecycle skill. So we just

added these two skills over here. You may want to add your own as well.

And your left-hand side should look kind of like this. So this code-review skill is

one made officially by Anthropic, but I think I changed a tiny

few things around. And then the task-lifecycle skill is basically based

on the CLA, claude-api class. Now, like we did before, I want to tag the

claude-code-guide and then say, so I made a brand-new folder, which is

toolkit, and that contains skills that I want loaded into

the sandbox every time. And these should be copied over to the .cloud

folder, /skills inside of the home directory. Can you

basically make that happen? And of course, this prompt will also be down

below as well. Now, this means that anytime you want to give your sandbox agent

a skill, you'd basically add it into this folder over here,

skills, and that will automatically be copied onto sandbox once

it's running. All right, so it says that our code-review skill conflicts with

the built-in one inside of Claude Code with the same name. So I will just

say skip this and just do task-lifecycle.

But you could also have it rename it if you have conflicting skills and then

add to a CLAude.md file which one it should prefer using. And now it's like,

cool, I made the changes over here. So let's actually see which changes it made.

So we can see, so we can see added a brand-new line,

which will basically build the skill files and then copy it

over to the sandbox in the correct location. So we can see it's now done.

And I will say, okay, cool. Can you commit, push the changes and

do another end-to-end test? All right, so it made the changes

and added the task-lifecycle skill and it moved the other

skill into a disabled folder over here. So it says

toolkit-disabled code-review, And now it's doing an end-to-end

test after deploying the changes. So I sent a quick message being

like, okay, what skills do you have available? And it said that it has the

task-lifecycle skill over here. And it seems that Claude Code was wrong earlier

by saying the code-review one will like conflict overlap because

there's no code-review one over here. But essentially it's now working whereby when

we put a skill inside of this folder, then it will automatically

be copied over to the sandbox environment. And we can simply add a new skill

by doing like new skill and then doing /SKILL.md.

And we can then commit this to GitHub as well.
